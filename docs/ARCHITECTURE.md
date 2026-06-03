# Architecture & Design Decisions

## 1. Style: RESTful Microservices Behind An API Gateway

The system is split into backend services, each owning a focused part of the
domain and exposing a REST API. A single API gateway is the public backend
entrypoint. It routes `/api/<segment>` to the owning service and forwards the
caller JWT unchanged.

```text
Frontend -> Gateway (8080) -> user-service
                         -> extinguisher-service
                         -> inspection-service
                         -> reporting-service
                         -> notification-service
                         -> PostgreSQL
```

| Concern | Where It Lives |
|---|---|
| Routing and single entrypoint | gateway |
| Identity, RBAC, profiles | user-service |
| Equipment master data | extinguisher-service |
| Scheduling and maintenance | inspection-service |
| Analytics and exports | reporting-service |
| User notifications | notification-service |

## 2. Authentication & Authorization

- Access tokens are short-lived JWTs signed with `JWT_SECRET`.
- Refresh tokens are longer-lived JWTs whose SHA-256 hashes are stored in
  `refresh_tokens`.
- Every service validates access tokens independently through shared middleware.
- RBAC is enforced through `requireRole('admin', ...)`.

Roles:

```text
admin
inspector
user
```

## 3. Data Ownership

All services use one PostgreSQL database for this local project. Each service
keeps its database access table-scoped, while the reporting service reads across
tables to produce summary and export data.

## 4. Shared Library

The `@fems/shared` package contains common backend helpers:

- `db.js` - PostgreSQL pool and transaction helper
- `auth.js` - authentication and role middleware
- `http.js` - API errors and async route helpers
- `validate.js` - request validation
- `createApp.js` - Express app factory, health route, Swagger setup, error tail

## 5. Communication

- Client traffic goes through the gateway.
- Services expose REST endpoints.
- Notifications are stored in the database and managed through the
  notification service.

## 6. Resilience & Ops

- Local startup runs PostgreSQL first, then migrations and seed data, then the
  backend services and gateway.
- Each service exposes `/health`.
- The gateway returns a JSON `502` response when an upstream service is not
  available.

## 7. Security Practices

- Passwords are hashed with bcrypt.
- SQL queries are parameterized.
- `helmet`, `cors`, validation, and centralized error handling are used.
- Secrets are read from `.env`.

## 8. Technology Choices

| Layer | Choice |
|---|---|
| Frontend | Next.js |
| Services | Node.js and Express |
| Database | PostgreSQL |
| Authentication | JWT |
| API docs | Swagger/OpenAPI |
| Local runtime | npm scripts |
