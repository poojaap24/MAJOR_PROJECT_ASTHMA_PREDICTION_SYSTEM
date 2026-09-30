# BreatheSafe — combined project

Your real backend (untouched) + the new real-data frontend, in the same layout as your
original project (`us/backend`, `us/frontend`).

## First-time setup

### Backend
```
cd us/backend
npm install
pip install -r requirements.txt --break-system-packages   # or use your own venv
cp .env.example .env    # fill in OPENWEATHER_API_KEY
```
Two processes to run (as before — nothing changed here):
```
node server.js                 # Express API, port 5000 by default
python PredictService.py       # Flask ML service, port 5001
```

### Frontend (new)
```
cd us/frontend
npm install
cp .env.example .env    # already points at http://localhost:5000
npm run dev             # pinned to port 3000 — matches the backend's existing CORS whitelist
```

Open http://localhost:3000.

## What changed vs. your old `frontend/`
Everything is in `us/frontend/src/lib/` (`api.ts`, `userProfile.ts`, `predictionHistory.ts`,
`aqi.ts`) plus the route files under `us/frontend/src/routes/`. Full breakdown of what's wired
to real data is in `newfrontend_guide.md`. Login/Signup are now real too (SQLite + JWT) — setup and
file map are in `AUTH_SETUP.md`.

The prediction backend is unchanged apart from the auth wiring in `us/backend/server.js`
(cookie-parser, credentialed CORS, `/api/auth` routes) and the new `us/backend/auth/` folder.

**Note:** `us/backend/venvvenv/` was left out of this zip (virtualenvs aren't portable) —
recreate it with `pip install -r requirements.txt`.

## Login / signup
The app pages now require an account. One extra step on first run: run `npm install` in `us/backend` and add the two JWT secrets
to `us/backend/.env` — see **`AUTH_SETUP.md`**. No database server needed.
