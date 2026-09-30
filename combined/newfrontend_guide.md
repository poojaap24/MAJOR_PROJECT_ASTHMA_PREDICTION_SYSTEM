# Connecting the Lovable (BreatheSafe) frontend to your real backend

Your backend was **not touched at all** — everything below is frontend-only.

## What I did

The Lovable export is a different stack (TanStack Start + Vite + Tailwind + shadcn, all mock
data) from your current frontend (Create React App, real Express calls). So this wasn't a
copy‑paste — I took the Lovable UI as the new frontend and rewired it to call your real
`backend/server.js`, reusing the working logic your CRA frontend already had:

| File | What it does |
|---|---|
| `src/lib/api.ts` | Real API client (ported from your old `src/api/client.js`), reads the backend URL from `VITE_API_BASE_URL` |
| `src/lib/userProfile.ts` | Health profile (age/severity/allergy), saved to `localStorage`, exact shape `POST /api/predict-risk` expects |
| `src/lib/predictionHistory.ts` | Every prediction you run gets saved to `localStorage`, powering Dashboard/History |
| `src/lib/aqi.ts` | Real EPA PM2.5→AQI formula + backend risk-label mapping (`LOW`→`safe`, etc.) |

**Pages rewired to real data:**
- **Predict** — search (OpenStreetMap Nominatim, free/no key) or "My location" → `/geocode` →
  `/air` → auto-fills the 16-reading buffer via `/api/test-add-reading` (same demo-seed trick
  your old frontend used) → `/api/predict-risk`. Real result, real advice, saved to history.
- **Settings** — real form, saved to `localStorage`, feeds Predict directly.
- **Dashboard** — shows your latest real prediction (pollutants, AQI, advice) with a proper
  empty state if you haven't run one yet.
- **History** — real predictions, searchable/filterable, CSV export still works.
- **Analytics** — every chart is now built from your real prediction history (AQI trend, risk
  distribution, pollutant averages, risk score trend), plus the real unseen-city R² pulled live
  from `GET /api/model-metrics`. Empty state shown per-chart until you've run predictions.
- **How AI Works** — the "Model performance" cards fetch real MAE/RMSE/R² from
  `GET /api/model-metrics` (your `backend/forecast_metrics.json`), with a loading skeleton and
  an error state if the backend isn't reachable.

**Left as-is (flagged, not silently broken):**
- **Login / Signup** — now wired to real auth (SQLite + JWT). See `AUTH_SETUP.md`.
- The **landing page's** "Live now" teaser card still uses Lovable's sample data — it's
  pre-login marketing chrome, not part of the app itself, so I left it alone. Say the word if
  you want it to pull your most recent real prediction instead.

## How to actually swap it in

1. In your project, rename or delete your current `frontend/` folder (or move it aside as
   `frontend-old/` — don't delete outright until you've confirmed the new one works).
2. Unzip `breathesafe-frontend-real.zip` and put the `newfrontend` folder in its place,
   renaming it to `frontend`.
3. `cd frontend && npm install`
4. Copy `.env.example` to `.env` (already points at `http://localhost:5000`, your backend's
   default port — check `backend/.env` if you changed `PORT`).
5. Start your backend as usual: `cd backend && npm start`
6. Start the new frontend: `npm run dev` — it's pinned to **port 3000**, which is already in
   your backend's CORS whitelist, so no backend changes were needed.

## One thing to double check
The predict flow needs `/api/test-add-reading` to stay enabled in `server.js` (your comments
say "remove before real deployment") — as long as it's still there, predictions work
immediately in dev. When you're ready for production behavior (real 16-reading windows over
time), just stop calling that seed step — I can show you where if/when you want that.
