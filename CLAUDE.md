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

## Deployment

Neon (Postgres) + Render (backend) + Vercel (frontend); see `DEPLOYMENT.md` for the live URLs and full walkthrough. Render's Root Directory / Build Command / Start Command fields must be filled in explicitly — leaving them blank makes Render silently guess the wrong command instead of failing loudly.
