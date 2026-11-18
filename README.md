# NETWORK — Data Control

A mobile-first, installable web app for manually tracking a mobile data bundle.

## Features
- Bundle allowance, used data, remaining data and percentage meter
- Manual usage entries with a local history
- Renewal date display
- Low-data warning and optional browser notifications
- Local persistence using `localStorage`
- PWA manifest and service worker for offline shell caching
- Responsive black and neon-red interface

## Run locally
A service worker requires a secure context. Use HTTPS hosting or a local development server.

### Option A: GitHub Pages
1. Create a GitHub repository.
2. Upload all files and folders in this project.
3. In repository Settings → Pages, enable deployment from your main branch and root folder.
4. Open the published HTTPS URL on Android Chrome.
5. Use Chrome's menu → Add to Home screen / Install app.

### Option B: Local computer
Run a static server from this folder, for example:
`python -m http.server 8000`
Then open `http://localhost:8000`.

## Android phone-only editing
Use a free HTML editor that can save folders and files, or upload this project to a static HTTPS host. Opening `index.html` directly with a `file://` URL may show the site, but service workers and PWA installation generally require HTTPS or localhost.

## Important limitations
This app records usage values entered by the user. A standard website cannot read total mobile data usage across Android apps or override carrier bundle limits. Device-wide usage monitoring requires a native Android app and the appropriate Android APIs/permissions.

## Privacy
Bundle settings and usage history are stored in this browser's local storage. Clearing browser site data will remove them. No account or backend is included.
