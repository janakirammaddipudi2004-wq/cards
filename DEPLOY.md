# Deploy

This app deploys as three Render resources:

- `cards-backend`: Node/Express + Socket.IO API
- `cards-frontend`: Vite static site
- `cards-postgres`: Postgres database

## 1. Push the repo to GitHub

Render Blueprints deploy from a Git repository, so push this folder to GitHub first.

## 2. Create the Render Blueprint

In Render:

1. New > Blueprint.
2. Select the GitHub repo.
3. Render will read `render.yaml`.
4. Add the same Google OAuth client ID in both places:
   - `cards-backend` env var: `GOOGLE_CLIENT_ID`
   - `cards-frontend` env var: `VITE_GOOGLE_CLIENT_ID`

The backend `JWT_SECRET` is generated automatically. The database URL is wired automatically.

## 3. Confirm URLs

The included `render.yaml` assumes these URLs:

- Frontend: `https://cards-frontend.onrender.com`
- Backend: `https://cards-backend.onrender.com`

If Render assigns different URLs, update:

- Backend `FRONTEND_URL`
- Frontend `VITE_API_URL`
- Frontend `VITE_BACKEND_URL`

Then redeploy both services.

## 4. Update Google OAuth

In Google Cloud Console for the OAuth web client:

- Add the frontend URL under Authorized JavaScript origins.
- Local development can remain as `http://localhost:5173`.

This app verifies Google ID tokens server-side using `GOOGLE_CLIENT_ID`.

## 5. Verify

After deployment:

- Open the frontend URL.
- Sign in with Google.
- Create a table.
- Join from another browser/profile.
- Start a 2-player game.

Backend health check:

```bash
curl https://cards-backend.onrender.com/health
```
