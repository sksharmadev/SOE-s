require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, 'site-data.json');
if (!process.env.SESSION_SECRET || !process.env.ADMIN_PASSWORD) {
  console.warn('Security setup: copy .env.example to .env and set SESSION_SECRET and ADMIN_PASSWORD before using the admin panel.');
}
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(session({
  name: 'seaofexim.sid',
  secret: process.env.SESSION_SECRET || 'development-only-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 3 }
}));
app.use(express.static(path.join(__dirname, '..', 'public')));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' } });

function readData() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function requireAdmin(req, res, next) { if (req.session && req.session.isAdmin) return next(); return res.status(401).json({ error: 'Please sign in as an administrator.' }); }
function cleanString(v, max = 300) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

app.get('/api/site', (_req, res) => {
  const data = readData();
  res.json({ settings: data.settings, services: data.services, products: data.products });
});
app.post('/api/contact', (req, res) => {
  const name = cleanString(req.body.name, 100), email = cleanString(req.body.email, 160), subject = cleanString(req.body.subject, 160), message = cleanString(req.body.message, 3000);
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter your name, a valid email address and a message.' });
  const data = readData();
  data.messages.unshift({ id: Date.now().toString(36), name, email, subject, message, createdAt: new Date().toISOString(), read: false });
  writeData(data);
  res.status(201).json({ message: 'Thanks — your enquiry has been received.' });
});
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const username = cleanString(req.body.username, 80), password = typeof req.body.password === 'string' ? req.body.password : '';
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  if (!expectedPassword || username !== expectedUser || password.length > 200 || !await bcrypt.compare(password, await bcrypt.hash(expectedPassword, 10))) {
    return res.status(401).json({ error: 'Incorrect username or password. Check your .env settings.' });
  }
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Could not start a secure session.' });
    req.session.isAdmin = true;
    req.session.username = username;
    res.json({ message: 'Signed in.', username });
  });
});
app.get('/api/admin/me', requireAdmin, (req, res) => res.json({ username: req.session.username }));
app.post('/api/admin/logout', requireAdmin, (req, res) => req.session.destroy(() => res.json({ message: 'Signed out.' })));
app.get('/api/admin/data', requireAdmin, (_req, res) => res.json(readData()));
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const data = readData(), fields = ['companyName','tagline','description','email','phone','address','heroTitle','heroText'];
  fields.forEach(k => { if (typeof req.body[k] === 'string') data.settings[k] = cleanString(req.body[k], k === 'description' || k === 'heroText' ? 500 : 180); });
  writeData(data); res.json({ message: 'Website content updated.', settings: data.settings });
});
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const name = cleanString(req.body.name, 120), category = cleanString(req.body.category, 80), description = cleanString(req.body.description, 500), image = cleanString(req.body.image, 500);
  if (!name || !category || !description) return res.status(400).json({ error: 'Name, category and description are required.' });
  if (image && !/^https:\/\//i.test(image)) return res.status(400).json({ error: 'Product image must use an https:// URL.' });
  const data = readData(); const product = { id: Date.now().toString(36), name, category, description, image }; data.products.push(product); writeData(data); res.status(201).json(product);
});
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const data = readData(), product = data.products.find(p => p.id === req.params.id); if (!product) return res.status(404).json({ error: 'Product not found.' });
  ['name','category','description','image'].forEach(k => { if (typeof req.body[k] === 'string') product[k] = cleanString(req.body[k], k === 'description' ? 500 : 500); });
  if (product.image && !/^https:\/\//i.test(product.image)) return res.status(400).json({ error: 'Product image must use an https:// URL.' });
  writeData(data); res.json(product);
});
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => { const data = readData(); const old = data.products.length; data.products = data.products.filter(p => p.id !== req.params.id); if (old === data.products.length) return res.status(404).json({ error: 'Product not found.' }); writeData(data); res.json({ message: 'Product deleted.' }); });
app.get('/api/admin/messages', requireAdmin, (_req, res) => res.json(readData().messages));
app.patch('/api/admin/messages/:id', requireAdmin, (req, res) => { const data = readData(), m = data.messages.find(x => x.id === req.params.id); if (!m) return res.status(404).json({ error: 'Message not found.' }); m.read = Boolean(req.body.read); writeData(data); res.json(m); });
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'))); 
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'), err => err && next(err));
});
app.listen(PORT, () => console.log(`Sea of Exim website running at http://localhost:${PORT}`));
