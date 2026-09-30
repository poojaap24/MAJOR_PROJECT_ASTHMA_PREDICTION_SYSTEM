# Login & signup

The BreatheSafe login/signup pages talk to a real auth API. The look of the pages is unchanged
(same split sky layout, sunset button, tokens from `styles.css`).

Accounts are stored in a local **SQLite file** (`us/backend/auth/auth.db`) that is created
automatically on first start — no database server to install.

## Requirements
- **Node.js 22.13 or newer** (check with `node -v`; get the LTS from nodejs.org if it's older).
  The built-in `node:sqlite` module is what makes "no install" possible.

## Run it (Windows PowerShell, from this `combined` folder)

```powershell
# 1. Backend — first time only
cd us\backend
npm install
copy .env.example .env      # then open .env: add OPENWEATHER_API_KEY and two random JWT secrets

# generate a secret (run twice, paste each into .env):
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Start the API (port 5000)
node server.js

# 3. New terminal — ML service (port 5001)
cd us\backend
python PredictService.py

# 4. New terminal — frontend (port 3000)
cd us\frontend
npm install                 # first time only
npm run dev
```

Open http://localhost:3000 -> **Get started** -> create an account.
You should see `✅ Auth database ready` in the backend terminal.
(An "ExperimentalWarning: SQLite is an experimental feature" line is harmless.)

## What changed

| Where | What |
|---|---|
| `us/backend/auth/` (new) | Auth code: SQLite storage (tables auto-created), JWT helpers, models, controller, validators, rate limiter, routes |
| `us/backend/server.js` | `cookie-parser`, `credentials: true` on CORS (needed for the refresh cookie), `app.use("/api/auth", ...)` |
| `us/backend/package.json`, `.env.example` | New dependencies (`bcryptjs`, `cookie-parser`, `express-rate-limit`, `express-validator`, `jsonwebtoken`) and JWT variables |
| `us/frontend/src/lib/auth.tsx` (new) | `AuthProvider` + `useAuth()` — login, register, logout, silent session restore |
| `us/frontend/src/components/AuthSplit.tsx` | Same layout; fields are now controlled, plus error banner, loading state, show/hide password |
| `us/frontend/src/routes/login.tsx`, `signup.tsx` | Call the real API; redirect to `/dashboard` on success |
| `us/frontend/src/routes/_shell.tsx` | App pages now require sign-in; sidebar shows the real name + email and a **Sign out** button |
| `us/frontend/src/routes/__root.tsx` | Wraps the app in `AuthProvider` |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` — password: 8+ chars, upper, lower, number |
| POST | `/api/auth/login` | `{ email, password }` — locks the account for 15 min after 5 bad passwords |
| POST | `/api/auth/refresh` | uses the httpOnly cookie; rotates it |
| POST | `/api/auth/logout` | revokes the refresh token, clears the cookie |
| GET | `/api/auth/me` | needs `Authorization: Bearer <accessToken>` |

## Good to know

- **Reset all accounts:** stop the backend and delete `us/backend/auth/auth.db*`.
- **Prediction endpoints are still open.** `/air`, `/geocode`, `/api/predict-risk` etc. don't require a
  token — only the *pages* are gated.
- **If the auth database can't open**, the prediction API still starts (it logs why); only login/signup fail.
- **Health profile and prediction history are still per-browser** (`localStorage`), not per-account.
- The refresh cookie is scoped to `/api/auth` (in the standalone project it was `/api/auth/refresh`,
  so `/logout` never received it and couldn't revoke the token).
- **Deploying frontend and API on different sites?** Set `CLIENT_ORIGIN`, `COOKIE_SECURE=true` and
  `COOKIE_SAMESITE=none` in `backend/.env` (HTTPS required). For production you may want to move to a
  server database like MySQL/Postgres — only `backend/auth/config/db.js` and `models/` would change.
