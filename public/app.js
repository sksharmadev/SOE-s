'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const year = $('#year');
if (year) year.textContent = new Date().getFullYear();

const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');
if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $$('a', mainNav).forEach(link => link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }));
}

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function loadSite() {
  try {
    const response = await fetch('/api/site');
    if (!response.ok) throw new Error('Could not load website content.');
    const data = await response.json();
    const settings = data.settings || {};
    if (settings.companyName) document.title = `${settings.companyName} | ${document.title.split('|')[0].trim()}`;

    const heroTitle = $('#heroTitle');
    if (heroTitle && settings.heroTitle) heroTitle.innerHTML = escapeHtml(settings.heroTitle).replace(/\n/g, '<br>');
    const heroText = $('#heroText');
    if (heroText && settings.heroText) heroText.textContent = settings.heroText;
    const aboutDescription = $('#aboutDescription');
    if (aboutDescription && settings.description) aboutDescription.textContent = settings.description;

    const email = $('#contactEmail');
    if (email) { email.textContent = settings.email || ''; email.href = settings.email ? `mailto:${settings.email}` : '#'; }
    const phone = $('#contactPhone');
    if (phone) { phone.textContent = settings.phone || ''; phone.href = settings.phone ? `tel:${settings.phone.replace(/[^+\d]/g, '')}` : '#'; }
    const address = $('#contactAddress');
    if (address) address.textContent = settings.address || '';

    const serviceGrid = $('#serviceGrid');
    if (serviceGrid && Array.isArray(data.services)) {
      serviceGrid.innerHTML = data.services.map((service, index) => `<article class="service-card"><span class="service-number">${String(index + 1).padStart(2, '0')}</span><div class="service-icon" aria-hidden="true">${['⇄', '⌁', '▤', '◎'][index % 4]}</div><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.text)}</p><a href="/contact.html">Discuss this service ↗</a></article>`).join('');
    }

    const productGrid = $('#productGrid');
    if (productGrid && Array.isArray(data.products)) {
      productGrid.innerHTML = data.products.length ? data.products.map(product => `<article class="product-card">${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none'">` : ''}<div class="product-card-content"><span class="category">${escapeHtml(product.category)}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description)}</p><a href="/contact.html">Enquire about this →</a></div></article>`).join('') : '<p class="muted">No product categories have been added yet. Please contact us for enquiries.</p>';
    }
  } catch (error) {
    console.error('Website content loading failed:', error);
    const productGrid = $('#productGrid');
    if (productGrid) productGrid.innerHTML = '<p class="muted">Products could not be loaded. Please refresh the page.</p>';
  }
}

const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = $('button[type="submit"]', form);
    const status = $('#formStatus');
    if (button) { button.disabled = true; button.textContent = 'Sending…'; }
    if (status) { status.textContent = ''; status.style.color = ''; }
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send enquiry.');
      if (status) status.textContent = result.message || 'Your enquiry has been received.';
      form.reset();
    } catch (error) {
      if (status) { status.textContent = error.message || 'Something went wrong. Please try again.'; status.style.color = '#b42318'; }
    } finally {
      if (button) { button.disabled = false; button.innerHTML = 'Send Enquiry <span>→</span>'; }
    }
  });
}

loadSite();
