# Free Deploy

This repo is configured for a free Render deployment.

The included `render.yaml` explicitly sets the backend and Postgres database to Render's free plan. If Render still asks for payment, do not continue that paid checkout. Use the manual free setup below instead.

## Option A: Render Blueprint

Use this when Render accepts the free Blueprint resources.

1. Push the repo to GitHub.
2. In Render, choose New > Blueprint.
3. Select this GitHub repo.
4. Render reads `render.yaml` and creates:
   - `cards-backend`: free Node web service
   - `cards-frontend`: free static site
   - `cards-postgres`: free Postgres database
5. When Render prompts for env vars, add:
   - Backend `GOOGLE_CLIENT_ID`
   - Frontend `VITE_GOOGLE_CLIENT_ID`

The Blueprint generates `JWT_SECRET` and wires `DATABASE_URL` automatically.

Important: Render free Postgres is for testing/hobby use. At the time this guide was written, Render's free Postgres database expires after 30 days.

## Option B: Manual Free Setup

Use this if Blueprint creation asks for payment, or if you want a free external database.

### 1. Create a Free Postgres Database

Create a free Postgres database with Supabase, Neon, or another provider.

Copy the Postgres connection string. If the provider requires SSL, either append `?sslmode=require` to the URL or set `DATABASE_SSL=true` in Render.

### 2. Create the Backend on Render

In Render:

1. New > Web Service.
2. Connect this GitHub repo.
3. Instance type: Free.
4. Build command:

```bash
cd backend && npm ci --include=dev && npm run build
```

5. Start command:

```bash
cd backend && node dist/backend/src/db/migrate.js && npm start
```

6. Add env vars:

```bash
NODE_ENV=production
DATABASE_URL=<your_postgres_connection_string>
DATABASE_SSL=true
JWT_SECRET=<a_long_random_secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<your_google_oauth_client_id>
FRONTEND_URL=https://cards-frontend.onrender.com
```

If you use Render's own Postgres database, use `DATABASE_SSL=false`.

### 3. Create the Frontend on Render

In Render:

1. New > Static Site.
2. Connect this GitHub repo.
3. Build command:

```bash
cd frontend && npm ci --include=dev && npm run build
```

4. Publish directory:

```bash
frontend/dist
```

5. Add env vars:

```bash
VITE_API_URL=https://cards-backend.onrender.com
VITE_BACKEND_URL=https://cards-backend.onrender.com
VITE_GOOGLE_CLIENT_ID=<your_google_oauth_client_id>
```

If Render gives your services different URLs, use the actual URLs instead of the examples.

### 4. Fix URLs After Creation

After both services exist:

1. Copy the frontend Render URL.
2. Set backend `FRONTEND_URL` to that frontend URL.
3. Copy the backend Render URL.
4. Set frontend `VITE_API_URL` and `VITE_BACKEND_URL` to that backend URL.
5. Redeploy both services.

### 5. Google OAuth

In Google Cloud Console, add your frontend URL under Authorized JavaScript origins.

Keep local development origin if you still test locally:

```bash
http://localhost:5173
```

## Verify

Open:

```bash
https://cards-backend.onrender.com/health
```

Then open the frontend, sign in, create a table, join from another browser/profile, and start a 2-player game.

## If Google Sign-In Stays on the Home Screen

Google sign-in has two steps:

1. The browser gets a Google credential.
2. The frontend sends that credential to the backend at `/auth/google`.

If step 1 works but the app stays on the sign-in/home screen, check the frontend env vars and redeploy the static site:

```bash
VITE_API_URL=https://cards-backend.onrender.com
VITE_BACKEND_URL=https://cards-backend.onrender.com
```

Also check the backend env var and redeploy the backend:

```bash
FRONTEND_URL=https://cards-frontend.onrender.com
```

If Render assigned different URLs, use the actual frontend and backend URLs.
