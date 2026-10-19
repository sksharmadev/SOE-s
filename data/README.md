# Sea of Exim — Responsive Website + Admin Dashboard

This project uses the supplied `index.html` as the public website and includes responsive CSS, browser JavaScript, an Express backend, administrator login, editable site content, product management, and an enquiry inbox.

## Requirements
- Node.js 20 or newer (npm is included)
- Internet access for first-time package installation

## Run locally on Windows
1. Download and extract `sea-of-exim-complete-website.zip`.
2. Open the extracted `sea-of-exim` folder in File Explorer.
3. Click the address bar, type `cmd`, and press Enter to open Command Prompt in that folder.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Copy the environment template:
   ```bat
   copy .env.example .env
   ```
6. Open `.env` in Notepad. Set a unique, strong `ADMIN_PASSWORD` and a random `SESSION_SECRET` (at least 32 characters). Change the admin username if desired. Never share or upload `.env`.
7. Start the server:
   ```bash
   npm start
   ```
8. Open the public site at http://localhost:3000.
9. Open the admin panel at http://localhost:3000/admin and sign in using the credentials you configured in `.env`.
10. In the dashboard, edit website content, add/edit/delete products, and review contact form enquiries.

## macOS / Linux
Use `cp .env.example .env` instead of the Windows `copy` command. Then follow the same `npm install`, `.env` configuration, and `npm start` steps.

## Files
- `server.js` — Express backend, API routes, admin sessions and contact enquiries
- `public/index.html` — supplied public-facing HTML
- `public/styles.css` — responsive website styling
- `public/app.js` — mobile navigation, public content loading, form submission
- `public/logo.svg` — Sea of Exim logo
- `public/admin.html`, `public/admin.css`, `public/admin.js` — admin interface
- `data/site-data.json` — starter content and saved enquiries
- `.env.example` — environment variable template

## Before using it with real customers
This is a runnable starter, not a deployed live website. It does not create a public domain automatically. Before production use, deploy to a Node.js host, configure HTTPS and `NODE_ENV=production`, replace sample contact details and product images, and review security and privacy requirements. The starter stores data in a JSON file and uses Express's default in-memory session store; for production/multiple instances, migrate to a database and persistent session store, add CSRF protection, backups, monitoring, and email delivery if enquiries must reach an inbox. Use a hosting plan with persistent storage if retaining the JSON data file.
