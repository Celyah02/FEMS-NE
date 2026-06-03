# Entity Relationship Diagram & Database Schema

Database: **PostgreSQL 16**. UUID primary keys (`gen_random_uuid()`), `TIMESTAMPTZ` timestamps, enum types for controlled vocabularies, and `updated_at` triggers.

## ERD (Mermaid)

```mermaid
erDiagram
    users ||--o{ refresh_tokens     : "has"
    users ||--o{ password_resets    : "has"
    users ||--o{ fire_extinguishers : "created_by"
    users ||--o{ inspections        : "assigned_to / scheduled_by"
    users ||--o{ maintenance_logs   : "performed_by"
    users ||--o{ notifications      : "receives"

    fire_extinguishers ||--o{ inspections      : "is inspected by"
    fire_extinguishers ||--o{ maintenance_logs : "is maintained by"
    inspections        ||--o{ maintenance_logs : "may trigger"

    users {
        uuid id PK
        varchar first_name
        varchar last_name
        varchar email UK
        varchar password_hash
        user_role role
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    refresh_tokens {
        uuid id PK
        uuid user_id FK
        varchar token_hash
        timestamptz expires_at
        boolean revoked
    }

    password_resets {
        uuid id PK
        uuid user_id FK
        varchar token_hash
        timestamptz expires_at
        boolean used
    }

    fire_extinguishers {
        uuid id PK
        varchar serial_number UK
        varchar location
        extinguisher_type type
        extinguisher_size size
        date installation_date
        date expiry_date
        extinguisher_status status
        timestamptz last_inspected_at
        uuid created_by FK
    }

    inspections {
        uuid id PK
        uuid extinguisher_id FK
        date scheduled_date
        time scheduled_time
        inspection_status status
        inspection_result result
        uuid assigned_to FK
        uuid scheduled_by FK
        text notes
        timestamptz completed_at
    }

    maintenance_logs {
        uuid id PK
        uuid extinguisher_id FK
        uuid inspection_id FK
        varchar action_taken
        date maintenance_date
        text issues_identified
        text notes
        text recommendations
        uuid performed_by FK
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text message
        varchar related_entity
        uuid related_id
        boolean is_read
        timestamptz created_at
    }
```

## Enum types

| Enum                  | Values |
|-----------------------|--------|
| `user_role`           | `admin`, `inspector`, `user` |
| `extinguisher_type`   | `water`, `co2`, `foam`, `dry_chemical` |
| `extinguisher_size`   | `2.5lb`, `5lb`, `9lb`, `12lb` |
| `extinguisher_status` | `active`, `maintenance`, `expired`, `decommissioned` |
| `inspection_status`   | `pending`, `completed`, `overdue`, `cancelled` |
| `inspection_result`   | `pass`, `fail`, `needs_maintenance` |

## Tables & relationships

| Table | Key relationships | Notable constraints / indexes |
|-------|-------------------|-------------------------------|
| `users` | parent of tokens, extinguishers, inspections, maintenance, notifications | `UNIQUE(email)`, index on `lower(email)`, `role` |
| `refresh_tokens` | `user_id → users` (CASCADE) | index `token_hash`; enables logout/revocation |
| `password_resets` | `user_id → users` (CASCADE) | one-time tokens, `expires_at`, `used` |
| `fire_extinguishers` | `created_by → users` (SET NULL) | `UNIQUE(serial_number)`, `CHECK(expiry_date >= installation_date)`, indexes on `status`, `type`, `expiry_date`, `location` |
| `inspections` | `extinguisher_id → fire_extinguishers` (CASCADE); `assigned_to`, `scheduled_by → users` (SET NULL) | indexes on `extinguisher_id`, `status`, `scheduled_date`, `assigned_to` |
| `maintenance_logs` | `extinguisher_id → fire_extinguishers` (CASCADE); `inspection_id → inspections` (SET NULL); `performed_by → users` | indexes on `extinguisher_id`, `maintenance_date` |
| `notifications` | `user_id → users` (CASCADE; NULL = broadcast) | indexes on `user_id`, `is_read`, `created_at` |

## Referential actions

- Deleting a **user** cascades their tokens/notifications but **nulls** their references on extinguishers/inspections/maintenance (preserve audit history).
- Deleting an **extinguisher** cascades its inspections and maintenance logs.
- Deleting an **inspection** nulls the `inspection_id` on related maintenance logs.

The authoritative schema is the set of SQL files in [`/db/migrations`](../db/migrations).
