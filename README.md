# LifeOS: Personal Emergency & Safety Dashboard

LifeOS is a full-stack web application for personal safety. You can keep emergency contacts, start and monitor journeys, check in when you arrive, open a full-screen SOS mode, share a QR emergency card and find nearby emergency services.

> **Student project notice:** SOS is a **simulation**. LifeOS never claims to contact police, ambulance or your contacts automatically. Calls and messages open **your own phone's** dialer or messaging app, and you press call or send yourself.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router 6, Lucide icons, CSS3 (custom design system, no UI framework) |
| Maps | Leaflet + react-leaflet, CARTO/OpenStreetMap tiles |
| Geodata | Browser Geolocation API, OpenStreetMap Nominatim (address search), Overpass API (nearby services) |
| QR codes | qrcode.react |
| Backend | Node.js 22, Express 4, REST API |
| Auth | JWT (7-day tokens) + bcrypt password hashing |
| Database | SQLite through Node's built-in `node:sqlite` driver (a file-based relational DB with no separate install) |
| Browser storage | LocalStorage for the session token, cached profile, theme and last location |

## Quick start

**Requirements:** Node.js **22.13 or newer** (check with `node -v`).

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5050/api/health

`npm install` installs both the `client` and `server` workspaces. `npm run dev` starts both servers together.

### Demo account

On first start the server creates a demo user with contacts, journeys and history:

- **Email:** `demo@lifeos.app`
- **Password:** `demo1234`

You can also click **"Explore with the demo account"** on the login page. To reset the demo data:

```bash
npm run seed
```

### Production build

```bash
npm run build   # builds client/dist
npm start       # Express serves the API and the built React app on http://localhost:5050
```

### Deploy online (Render, free)

The repo includes a `render.yaml` blueprint. On Render choose **New → Blueprint**, select this repository and click **Apply**. Render runs `npm install && npm run build` and then `npm start`, so a single web service hosts both the API and the React app.

> On Render's free plan the disk is temporary: the SQLite database resets when the service restarts or redeploys, and the demo account is recreated automatically. A permanent deployment would need a persistent disk or a hosted database.

## Features

| Page | What it does |
|---|---|
| **Landing** | Animated hero, feature overview, how-it-works and privacy sections |
| **Register / Login** | Validated forms, password strength meter, JWT session, one-click demo login |
| **Dashboard** | Time-based greeting, live safety status (safe / journey / overdue / SOS), SOS button, current location with map, contacts summary, active journey, "I'm Safe" check-in, recent activity |
| **Emergency (SOS)** | Full-screen mode with 5 actions, a cancellable 3/5/10-second countdown, then an "SOS ACTIVATED" screen showing location, contacts, time and status. Includes call, message, share-location, "I'm safe" and false-alarm actions |
| **Contacts** | Add, edit, delete, call and search contacts, mark one as primary, set priority. Validated on both client and server |
| **Journey** | Destination search with suggestions, quick arrival times, trusted contact, route-preview map. While a journey is active it shows a Start ↓ Now ↓ Destination timeline, a live countdown, a progress bar, an opt-in live-location map, "I'm Safe", "End Journey", "+15 min" and cancel. An overdue reminder appears when you pass your arrival time |
| **Emergency Card** | Card preview, a QR code that links to a public read-only page, per-field visibility toggles (sensitive fields are **off by default**), a sharing on/off switch, QR download and link regeneration |
| **Safety History** | Timeline grouped by day, filters for Today, This Week, This Month and All plus event type, and statistics tiles |
| **Nearby Services** | Real hospitals, police, fire stations and pharmacies from OpenStreetMap, shown as map markers and cards with distance, call and directions. **Demo data** is clearly labelled and used as a fallback |
| **Profile** | Photo upload (resized in the browser), personal details, emergency info summary, password change |
| **Settings** | Notifications, check-in reminders, SOS countdown, emergency number, location settings and permission status, dark/light theme, alert mode, privacy explanations, data export, clear history, delete account |

## Project structure

```
lifeos/
├── package.json              # npm workspaces + "dev" script (runs both apps)
├── client/                   # React + Vite frontend
│   ├── index.html
│   ├── vite.config.js        # proxies /api → http://localhost:5050
│   └── src/
│       ├── main.jsx          # providers: Router, Toast, Auth, Settings, Location
│       ├── App.jsx           # routes (lazy-loaded pages)
│       ├── components/       # ui.jsx (Card, Modal, Field, Toggle…), MapView, Brand, guards
│       ├── context/          # AuthContext, SettingsContext, LocationContext, ToastContext
│       ├── data/             # navigation, event types, mock emergency services
│       ├── hooks/            # useAsync, useNow, useDocumentTitle
│       ├── layouts/          # AppLayout (sidebar + bottom nav), AuthLayout
│       ├── pages/            # 13 pages
│       ├── services/         # api.js (REST client) + domain services
│       ├── styles/           # base, components, layout, landing, pages, emergency
│       └── utils/            # storage (LocalStorage helpers), validators, format
└── server/                   # Express REST API
    └── src/
        ├── index.js          # app setup, routes, error handling, static hosting
        ├── db.js             # SQLite connection + schema
        ├── seed.js           # demo account
        ├── middleware/auth.js
        ├── routes/           # auth, users, contacts, journeys, sos, history, card, settings
        └── utils/            # validation, serializers
```

## Database schema (SQLite)

| Table | Purpose |
|---|---|
| `users` | id, name, email (unique), password_hash, phone, photo, created_at |
| `contacts` | user_id → users, name, relationship, phone, email, priority, is_primary |
| `journeys` | user_id, start/destination label and coordinates, contact_id, started_at, expected_arrival, status, checkins, ended_at |
| `sos_events` | user_id, status (active/resolved/cancelled), location, snapshot of contacts, timestamps |
| `safety_history` | user_id, type, title, detail, location, created_at |
| `emergency_cards` | user_id, share_id (QR link), sharing_enabled, medical fields, visibility JSON |
| `settings` | user_id, JSON preferences |

All foreign keys use `ON DELETE CASCADE`, so deleting an account removes all of that user's data. The database file is created automatically at `server/data/lifeos.db`.

## REST API

All routes except `auth/register`, `auth/login`, `card/public/:shareId` and `health` need an `Authorization: Bearer <token>` header.

```
POST   /api/auth/register          POST   /api/auth/login          GET /api/auth/me
GET    /api/users/profile          PUT    /api/users/profile       PUT /api/users/password
GET    /api/users/export           DELETE /api/users/me

GET    /api/contacts               POST   /api/contacts
PUT    /api/contacts/:id           DELETE /api/contacts/:id        PATCH /api/contacts/:id/primary

GET    /api/journeys               GET    /api/journeys/active     POST /api/journeys
PUT    /api/journeys/:id           { action: checkin | complete | cancel | extend | location }

GET    /api/sos                    GET    /api/sos/active          POST /api/sos
PUT    /api/sos/:id                { action: resolve | cancel }

GET    /api/safety-history?from=ISO   POST /api/safety-history     DELETE /api/safety-history

GET    /api/card                   PUT    /api/card                POST /api/card/regenerate
GET    /api/card/public/:shareId   (public, returns only fields the owner made visible)

GET    /api/settings               PUT    /api/settings
GET    /api/health
```

Errors use the format `{ "error": "Friendly message", "fields": { "phone": "…" } }`, and the forms show these messages next to the matching fields.

## Architecture notes

- **UI never talks to storage directly.** Pages call service functions in `client/src/services/index.js` (`authService`, `contactService`, `journeyService`, `emergencyService`, `historyService`, `cardService`, `settingsService`, `userService`). Those functions use one REST client in `services/api.js`. To point the app at another backend, set `VITE_API_URL`.
- **LocalStorage helpers** are in `utils/storage.js` and are safe to call when storage is blocked. They hold the token, cached user, theme, settings and last known location, so a refresh is instant.
- **Validation happens on both sides.** `utils/validators.js` validates in the client and `server/src/utils/validate.js` validates in the API.
- **Error handling covers:** location permission denied, unsupported or insecure contexts, invalid phone numbers, empty fields, invalid journey times, a server that can't be reached, expired sessions (automatic logout), loading skeletons and empty states on every page.

## Privacy & safety design

- Location is read only when the user asks. It is read automatically only if the browser permission is already granted or the user turns on "auto-locate". Live tracking runs only on the Journey page while its toggle is on.
- The emergency card shows medical details only when the user switches each one on, and sharing can be turned off or the link regenerated at any time.
- Passwords are hashed with bcrypt and never returned by the API.
- Users can export all of their data as JSON or delete their account permanently.

## Accessibility & responsiveness

- Semantic landmarks, labelled form fields, `aria-invalid` and `aria-describedby` on errors, switches with `role="switch"`, focus-trapped modals that close with Esc, a skip link, and visible focus rings.
- The layout is mobile-first: a sidebar on desktop, and a top bar, bottom navigation with a centre SOS button and a slide-out drawer on mobile. Every page was tested at 375 px, 800 px and desktop widths with no horizontal scrolling.
- `prefers-reduced-motion` turns off animations.
