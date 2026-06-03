# Fire Extinguisher Management System

A RESTful, microservices-based Fire Extinguisher Management System built with:

- Next.js frontend
- Node.js and Express backend services
- PostgreSQL database
- JWT authentication
- Swagger/OpenAPI docs

## Architecture

```text
Browser -> Next.js frontend (3000)
        -> API gateway (8080)
        -> user-service (4001)
        -> extinguisher-service (4002)
        -> inspection-service (4003)
        -> reporting-service (4004)
        -> notification-service (4005)
        -> PostgreSQL (5432)
```

## Prerequisites

Install these on your PC:

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm, which comes with Node.js

Docker is not required for the normal local setup.

## Local Setup

### 1. Configure environment variables

Edit `.env` in the project root:

```env
PGUSER=fems
PGPASSWORD=fems_password
PGDATABASE=fems
PGHOST=localhost
PGPORT=5432
DATABASE_URL=postgres://fems:fems_password@localhost:5432/fems

JWT_SECRET=change_this_access_secret
JWT_REFRESH_SECRET=change_this_refresh_secret
GATEWAY_PORT=8080
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Use your own PostgreSQL username, password, and database name if they are different.

### 2. Create the PostgreSQL database

Open PostgreSQL/pgAdmin/psql and create a database that matches your `.env`.

Example using `psql`:

```powershell
psql -U postgres
```

Then inside `psql`:

```sql
CREATE USER fems WITH PASSWORD 'fems_password';
CREATE DATABASE fems OWNER fems;
\q
```

If you use a different username/password/database, update `.env` to match.

### 3. Install dependencies

From the project root:

```powershell
npm install
```

This installs dependencies for the frontend, backend services, database scripts, and shared package.

### 4. Run migrations and seed data

From the project root:

```powershell
npm run db:migrate
npm run db:seed
```

Seeded demo accounts use the password defined in `db/seed.js`.

Default accounts:

```text
admin@tzw.com
inspector@tzw.com
user@tzw.com
```

Default password:

```text
Password123!
```

### 5. Start the backend

From the project root:

```powershell
npm run dev:backend
```

This opens separate PowerShell windows for:

```text
user-service          http://localhost:4001
extinguisher-service  http://localhost:4002
inspection-service    http://localhost:4003
reporting-service     http://localhost:4004
notification-service  http://localhost:4005
gateway               http://localhost:8080
```

The frontend should talk to the gateway only:

```text
http://localhost:8080/api
```

### 6. Start the frontend

Open another terminal in the project root:

```powershell
npm run dev:frontend
```

Then open:

```text
http://localhost:3000
```

## Useful Commands

```powershell
npm run db:migrate       # apply pending migrations
npm run db:seed          # insert demo data
npm run db:reset         # migrate and seed
npm run dev:backend      # start all backend services
npm run dev:frontend     # start Next.js frontend
```

## API Docs

Swagger UI is available on each backend service:

```text
http://localhost:4001/docs
http://localhost:4002/docs
http://localhost:4003/docs
http://localhost:4004/docs
http://localhost:4005/docs
```

## Project Layout

```text
db/                         PostgreSQL migrations and seed scripts
shared/                     shared backend helpers
services/gateway/           API gateway
services/user-service/      auth and users
services/extinguisher-service/
services/inspection-service/
services/reporting-service/
services/notification-service/
frontend/                   Next.js app
docs/                       extra documentation
scripts/dev-backend.ps1     local backend launcher
```
