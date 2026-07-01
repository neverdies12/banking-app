# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Backend (`backend/`):
- `npm install`
- `npm run dev` — dev server with auto-restart (`node --watch`), reads `backend/.env` (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`)
- `npm start` — start without watch (used in production on Render)
- `npm run seed` — drops and recreates every table from `src/db/schema.sql`, then inserts demo data. Destructive: resets whatever `DATABASE_URL` currently points at, local or production.

Frontend (`frontend/`):
- `npm install`
- `npm run dev` — Vite dev server on `:5173`, reads `VITE_API_URL` from `frontend/.env`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally

There is no test suite in this repo.

## Architecture

Two independent Node projects with no shared code or monorepo tooling:

- `backend/` — Express + `pg`, talking directly to Postgres (Neon in production, same connection string for dev and prod). `src/server.js` mounts routers from `src/routes/*` under `/api/*`. Business logic (transfer validation, atomic balance updates, bill payment) lives inline in the route handlers — there's no separate service/repository layer.
- `frontend/` — Vite + React. Nearly all UI lives in one component, `src/BankingApp.jsx`; tab switching is local `activeTab` state, not a router. `src/api.js` is the only module that knows the backend's base URL and endpoint shapes.

**Refetch-after-write, not optimistic updates.** The frontend holds no state beyond what it last fetched. Every mutation (`api.createTransfer`, `api.payBill`, `api.patchCard`) is followed by `loadAll()`, which refetches accounts/transactions/bills/transfers/cards wholesale rather than patching local state from the mutation's response. Follow this pattern for new mutations rather than hand-rolling optimistic UI updates.

**Money as `NUMERIC`, converted at the route layer.** Postgres `NUMERIC` columns are explicitly cast to JS `Number` in each route handler before being serialized to JSON (see `routes/accounts.js`, `routes/transactions.js`, etc.) — the DB is the source of truth for precision, not `pg`'s default string representation.

**Dates are `DATE`, not `TIMESTAMPTZ`, on purpose.** `bills.due_date`, `transactions.occurred_at`, and `transfers.created_at` are all Postgres `DATE` because the UI only ever displays day-level granularity. `db/pool.js` overrides the type parser for OID 1082 to keep these as plain `YYYY-MM-DD` strings instead of `pg`'s default JS `Date` conversion — using `TIMESTAMPTZ` here previously caused a real off-by-one-day bug whenever the app server's local timezone wasn't UTC.

**Multi-statement writes use explicit transactions.** Transfers and bill payments are the only writes that touch more than one row; both use `pool.connect()` with explicit `BEGIN`/`COMMIT`/`ROLLBACK` and `FOR UPDATE` row locks on the affected account(s) rather than relying on the pool's implicit auto-commit. Follow this pattern for any new money-moving endpoint.

**`budgets` and `trendData` in `BankingApp.jsx` are intentionally static.** There's no backend table for budgets or historical net-worth snapshots — only wire these to the API if that's explicitly in scope for the task at hand.

**Auth is multi-tenant with an approval gate.** `users.status` is `pending` / `approved` / `rejected`; `POST /api/auth/register` always creates a `pending` row and never issues a token, and `POST /api/auth/login` rejects anything that isn't `approved` with a specific message. `users.role` (`user`/`admin`) is embedded directly in the JWT at login time (`routes/auth.js`), so `requireAdmin` (`middleware/auth.js`) never needs a DB round-trip to check it — if you ever add role changes that should take effect mid-session, remember existing tokens carry the *old* role until they expire (7 days) or the user logs in again.

`middleware/auth.js`'s `requireAuth` is mounted in `server.js` as `app.use("/api", requireAuth)` *after* `/api/auth` and `/api/health` are registered — that ordering is what keeps registration/login/health checks public while gating everything else. `/api/admin/*` additionally requires `requireAdmin`.

Every financial table (`accounts`, `transactions`, `bills`, `transfers`) has a `user_id` column, and every route filters by `req.user.sub` — there is no query anywhere that returns another user's data. `accounts.id` is a plain `SERIAL` (not the old fixed strings like `'chk'`), since ids now have to be globally unique across every user, not just within one demo account. `cards` has no `user_id` of its own; ownership is checked by joining through `accounts`.

**Approval auto-provisions accounts.** `POST /api/admin/users/:id/approve` (in `routes/admin.js`) does the status flip *and* creates a Checking + Savings account (and a `cards` row for the checking account) for that user in the same transaction, but only if they don't already have accounts — approving twice is a no-op on the account side. New users get $0 balances and no transaction history; only the original seeded admin (`alex@sable.bank`) has the rich demo dataset.

The frontend (`api.js`) stores the JWT and user object in `localStorage` (`sable_token` / `sable_user`) and attaches `Authorization: Bearer <token>` to every request. On any `401`, it fires a `sable:unauthorized` window event rather than throwing into the caller — `BankingApp`'s top-level component listens for that event to drop back to the login screen, so any new fetch call automatically gets this behavior for free via the shared `request()` helper. The Admin nav tab is only added to the sidebar/bottom-nav when `user.role === "admin"` (see `BASE_NAV_ITEMS` vs the `navItems` computed in `Dashboard`) — this is a UI convenience only, the real enforcement is server-side `requireAdmin`.

**Tailwind is required, not optional.** The JSX throughout `BankingApp.jsx` uses Tailwind utility classes (`flex`, `grid`, `md:grid-cols-2`, etc.) alongside the hand-written CSS in `GLOBAL_CSS`. Tailwind v4 is wired in via `@tailwindcss/vite` in `vite.config.js` plus `@import "tailwindcss";` in `src/index.css` (imported from `main.jsx`) — if that import or plugin ever gets removed, every utility class silently becomes a no-op (this happened once already: the project ran for a while with those classes doing nothing, and layouts degraded quietly instead of erroring).

## Deployment

Neon (Postgres) + Render (backend) + Vercel (frontend); see `DEPLOYMENT.md` for the live URLs and full walkthrough. Render's Root Directory / Build Command / Start Command fields must be filled in explicitly — leaving them blank makes Render silently guess the wrong command instead of failing loudly.
