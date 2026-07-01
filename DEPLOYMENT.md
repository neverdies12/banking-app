# Deploying Sable

Stack: Neon (Postgres) + Render (backend API) + Vercel (frontend).

## 1. Database — Neon

Already done for this project: a Neon project was created and its
connection string is in `backend/.env` as `DATABASE_URL`. That same
string is what you'll paste into Render's environment variables below.

## 2. Push to GitHub

```powershell
cd C:\Users\Administrator\Documents\banking-app
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## 3. Backend — Render

1. Go to [render.com](https://render.com), sign up / log in (GitHub login is easiest — it also grants Render access to your repos).
2. **New +** -> **Web Service** -> connect the `banking-app` repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment**, add:
   - `DATABASE_URL` = your Neon connection string
   - `CORS_ORIGIN` = `http://localhost:5173` for now (update after step 4)
   - `PORT` is set automatically by Render — no need to add it.
5. Click **Create Web Service**. Wait for the first deploy to finish, then copy the service URL (e.g. `https://banking-app-backend.onrender.com`).
6. One-time only: run the seed script against production from your machine:
   ```powershell
   cd C:\Users\Administrator\Documents\banking-app\backend
   npm run seed
   ```
   (It uses the same `DATABASE_URL` already in your local `.env`, so it seeds the same Neon database Render connects to.)

Note: Render's free tier spins down after inactivity — the first request after idling can take ~30s while it wakes up.

## 4. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com), sign up / log in with GitHub.
2. **Add New** -> **Project** -> import the `banking-app` repo.
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `dist` (default)
4. Under **Environment Variables**, add:
   - `VITE_API_URL` = the Render backend URL from step 3.6 (no trailing slash)
5. Click **Deploy**. Copy the resulting URL (e.g. `https://banking-app.vercel.app`).

## 5. Close the loop: update CORS

Go back to the Render dashboard -> your backend service -> **Environment**,
and update `CORS_ORIGIN` to your Vercel URL from step 4.5. Save — Render
redeploys automatically.

## Future updates

Both Render and Vercel are connected to the GitHub repo, so any future:

```powershell
git add -A
git commit -m "..."
git push
```

...auto-deploys both sides. No manual redeploy steps needed.
