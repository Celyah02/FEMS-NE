# Local Deployment Guide

## 1. Prerequisites

- Node.js 20 or newer
- PostgreSQL 14 or newer
- Ports free on your PC: `8080`, `4001-4005`, `5432`, and `3000`

## 2. Configuration

Copy `.env.example` to `.env` if needed:

```powershell
Copy-Item .env.example .env
```

Update these values for your machine:

- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Example:

```env
PGUSER=fems
PGPASSWORD=fems_password
PGDATABASE=fems
PGHOST=localhost
PGPORT=5432
DATABASE_URL=postgres://fems:fems_password@localhost:5432/fems
```

## 3. Create The Database

Open `psql` as your PostgreSQL admin user:

```powershell
psql -U postgres
```

Then run:

```sql
CREATE USER fems WITH PASSWORD 'fems_password';
CREATE DATABASE fems OWNER fems;
\q
```

If you choose different names or passwords, make sure `.env` matches.

## 4. Install Dependencies

From the project root:

```powershell
npm install
```

## 5. Migrate And Seed

From the project root:

```powershell
npm run db:migrate
npm run db:seed
```

## 6. Start Backend Services

From the project root:

```powershell
npm run dev:backend
```

This starts:

```text
user-service          http://localhost:4001
extinguisher-service  http://localhost:4002
inspection-service    http://localhost:4003
reporting-service     http://localhost:4004
notification-service  http://localhost:4005
gateway               http://localhost:8080
```

## 7. Start Frontend

Open a second terminal in the project root:

```powershell
npm run dev:frontend
```

Then open:

```text
http://localhost:3000
```

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Database connection error | Confirm PostgreSQL is running and `.env` matches your database. |
| `502 Upstream unavailable` from gateway | Confirm all backend service windows are still running. |
| Port already in use | Stop the app using that port or change the port in `.env` or service script. |
| Login fails | Run `npm run db:seed` and use an account from `db/seed.js`. |
