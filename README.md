# Gig by gig · project-g

A private workspace for escnaor: one next step, manual outreach, two follow-ups, and a ₹10,000–15,000 monthly income goal. Built from `CODEX_SPEC.md`, in Section 10 order. No OUT-list feature was added.

## What is here

- `backend/`: FastAPI, SQLAlchemy, Alembic migrations, bcrypt password login, revocable persistent sessions, Muse ingestion, earnings and durable Firebase delivery.
- `web/`: React + Vite + Tailwind. Login, Today, Gig detail, All gigs, Earnings, Portfolio, Settings.
- `mobile/`: Expo/React Native Android app with the same seven screens and shared backend. Package: **com.projectg.app**.
- `shared/`: API client, types, statuses, rupee/date formatting.
- `HANDOVER.md`: setup, environment variable names, deployment, APK installation, and outstanding device checks.

## Run locally

Use Node 22.22+ and Python 3.14 (tested with 22.22.2 / 3.14.4).

```bash
npm ci
uv venv backend/.venv
uv pip install --python backend/.venv/bin/python -r backend/requirements.txt
test -f backend/.env || python3 backend/setup_local.py
```

The setup helper creates a private, Git-ignored `backend/.env` with random first-setup secrets. It refuses to replace an existing file. Read `INITIAL_PASSWORD` locally; do not copy it into a shared document. You can edit it before the first backend start. The database stores only its bcrypt hash. Change the password from Settings after logging in.

Start the backend in one terminal:

```bash
cd backend
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the web app in another terminal, from the repository root:

```bash
npm run dev
```

Open [the local web app](http://localhost:5173). By default it uses `http://localhost:8000`. SQLite is for local development only. Render must use a persistent Neon Postgres `DATABASE_URL` shared by the website and phone.

## Verify

```bash
npm run lint
npm run test:web
npm run build
npm run check:mobile
npm run test:mobile
npm run check:bundle -w mobile
cd backend
.venv/bin/ruff check app tests migrations preview.py setup_local.py check_postgres.py
.venv/bin/python -m pytest -q
.venv/bin/python check_postgres.py
```

`check_postgres.py` uses a temporary local PostgreSQL cluster on port 55433. Set `PG_BIN` if PostgreSQL binaries are elsewhere. It checks upgrades, schema drift, rollback/re-upgrade, and runs the API suite, then stops and removes the cluster. Tests use disposable data.

The Android bundle check deliberately allows missing deployment configuration for a **local JavaScript export only**. It does not produce an APK or prove native Firebase delivery. Native build commands check the real Firebase file and HTTPS backend URL. EAS repeats the check after dependency installation and before compiling the APK.

For disposable browser review, run `cd backend && .venv/bin/python preview.py`. Its only gig is labelled `TEST ONLY`; the whole temporary database disappears on exit. It never seeds the real database.

## Rules preserved

Outreach unlocks after approval. Copy only copies; the user sends messages in WhatsApp or email. Sent records its first timestamp and sets Day 3 and Day 7 dates. A recorded follow-up does not move either date. Replied and subsequent stages suppress reminders; Lost clears pending dates. There is no third reminder.

Won requires a quote and positive advance, defaulting to 50%. Paid advance requires an amount and paid date. Payments are recorded outside the app. Monthly earnings sum separate advances, balances, and maintenance receipts without adding the full quoted price again. Retainer receipt IDs protect repeat requests from double-counting.

Web and phone refresh from the same API on focus and periodically while active. Notes follow remote edits when untouched, preserve local drafts, and reject a stale overwrite on the backend.

No public sign-up, sending automation, payment gateway, invoices/GST, AI features, analytics dashboard, marketplace integration, web push, Play Store listing, or paid subscription is included.
