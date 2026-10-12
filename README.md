# Surviv Interiors — Static Website (GitHub Pages)

A complete static conversion of the Surviv Interiors Google Apps Script website.
Every feature from the original Apps Script version works: public website,
lead capture, feedback with star ratings, photo/video gallery, and the full
admin panel (dashboard, leads, feedback, media library, settings).

## Files

```
index.html      — the complete website markup
css/style.css   — all styles
js/data.js      — data layer (localStorage) mirroring the Code.gs API
js/app.js       — frontend logic (identical behavior to the Apps Script version)
```

## Features (all working)

**Website**
- Hero slider with auto-rotation, dots and arrows
- Animated stat counters, scroll-reveal animations
- Services grid, Why-Us, 4-step process sections
- Gallery with filters (All / Photos / Videos / Living / Kitchen / Bedroom),
  lightbox viewer (images + YouTube embeds)
- Auto-rotating testimonials carousel
- Feedback form with interactive star input
- FAQ accordion
- Lead/consultation form with validation
- WhatsApp floating button, back-to-top, sticky header, mobile menu

**Admin panel** (click "Admin" in the header, default password: `admin123`)
- Dashboard with live stats and recent leads/feedback
- Leads: status dropdown (New → Won/Lost), call button, delete, export CSV
- Feedback: approve/hide toggle (controls what shows on the website), delete
- Media: add photo by URL, add video by URL (YouTube plays inline),
  publish/unpublish toggle, delete
- Settings: business name, tagline, phone, WhatsApp, email, address, social
  links — all reflected live on the site; admin password change

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g. `survi-interiors`).
2. Push this folder:

   ```bash
   git init
   git add .
   git commit -m "Surviv Interiors static website"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/survi-interiors.git
   git push -u origin main
   ```

3. On GitHub: **Settings → Pages → Source: Deploy from a branch**,
   choose `main` / `(root)`.
4. Your site goes live at `https://YOUR-USERNAME.github.io/survi-interiors/`
   (takes ~1 minute).

## How the data works on a static host

`js/data.js` is a drop-in replacement for the Apps Script backend. It exposes
the exact same functions (`submitLead`, `getStats`, `getLeads`, ...),
backed by `localStorage` instead of Google Sheets + Script Properties:

- Business settings, leads, feedback and media persist in the browser
- First visit seeds realistic demo content (leads, feedback, gallery items)
- The admin password is stored in settings — change it in
  Admin → Settings → Security

**Important:** localStorage is per-browser. Data entered on one device is not
visible on another, and the admin password is stored client-side (not secure).
For multi-device shared data, swap `js/data.js` for a small API call to a
free backend (e.g. SheetDB, Firebase, or a published Google Sheet) — the
rest of the site needs no changes since all server calls go through the
`callServer()` bridge in `js/app.js`.
