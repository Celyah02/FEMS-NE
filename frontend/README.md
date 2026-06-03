# FEMS Frontend (Next.js)

The web client for the Fire Extinguisher Management System. Talks to the backend
exclusively through the **API gateway** (`NEXT_PUBLIC_API_URL`, default
`http://localhost:8080/api`).

## Run

```bash
npm install
npm run dev          # http://localhost:3000
# production
npm run build && npm start
```

> The backend services must be running (from the repo root: `npm run dev:backend`).

## Stack

- **Next.js 14** (App Router), React 18
- **Tailwind CSS** for styling
- Token-based auth (access + refresh) stored in `localStorage`, with transparent
  access-token refresh on `401` (see [`lib/api.js`](lib/api.js)).

## Structure

```
app/
  (auth)/            # public: login, register, forgot-password
  (app)/             # protected shell (sidebar + topbar + notifications)
    dashboard/       # KPI overview
    extinguishers/   # CRUD + filters
    inspections/     # schedule + complete
    maintenance/     # history + log
    reports/         # 4 report tabs + PDF/CSV export
    profile/         # edit profile, change password
    users/           # admin-only user management
components/          # AppShell, UI primitives
lib/                 # api client, auth context
```

## Role-aware UI

The sidebar and action buttons adapt to the logged-in role
(`admin` / `inspector` / `user`), mirroring the backend RBAC. The “Users” page is
admin-only and additionally guards on the client.

## Demo accounts

`admin@tzw.com` · `inspector@tzw.com` · `user@tzw.com` — password `Password123!`.
