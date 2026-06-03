# UI Design & Mockups

The user interface is **implemented** in the Next.js app (`/frontend`) — the live
pages are the realized design. This document maps each required screen to its
implementation and describes the layout, so it doubles as the design spec.

## Design language

- **Brand:** fire-safety red (`#b91c1c` / `#dc2626`) on a light slate background.
- **Layout:** left sidebar navigation + top bar (user, role badge, notifications,
  logout). Responsive: sidebar collapses to a scrollable top nav on mobile.
- **Components:** cards, tables, modals, status badges (color-coded by state),
  KPI stat tiles, simple bar indicators.

## Screen-by-screen

### 1. Registration form — `/register`
First name, last name, email, password with inline validation; links to login.
Auto-logs-in on success.

```
┌──────────────────────────────┐
│  Create your account         │
│  [First name] [Last name]    │
│  [Email................. ]   │
│  [Password.............. ]   │
│  ( Create account )          │
│  Already have an account? ↩  │
└──────────────────────────────┘
```

### 2. Login form — `/login`
Email + password, demo-account hint, links to register / forgot-password.

```
┌──────────────────────────────┐
│        🔥  TZW FEMS          │
│  [Email................. ]   │
│  [Password.............. ]   │
│  ( Sign in )                 │
│  Forgot password?   Register │
└──────────────────────────────┘
```

### 3. Dashboard — `/dashboard`
KPI tiles (total extinguishers, compliance %, pending/overdue inspections,
upcoming expirations) + panels: by-status, by-type bars, inspection status grid,
recent maintenance.

```
┌─────┬─────────────────────────────────────────────┐
│ NAV │  [Total] [Compliance] [Pending] [Expiring]   │
│ 📊  │  ┌ by status ─┐ ┌ by type ───┐                │
│ 🧯  │  │ active  5  │ │ co2  ███ 3 │                │
│ 🗓️  │  └────────────┘ └────────────┘                │
│ 📑  │  ┌ inspection status ┐ ┌ recent maintenance ┐ │
└─────┴─────────────────────────────────────────────┘
```

### 4. Fire Extinguisher pages — `/extinguishers`
Filter bar (search, status, type) + table (serial, location, type, size, expiry,
status badge, actions). Add/Edit modal with all fields; delete (admin).

### 5. Inspection scheduling — `/inspections`
Status filter + table; **Schedule** modal (extinguisher, date, time, notes);
**Complete** modal (result: pass / fail / needs-maintenance, notes).

### 6. Maintenance — `/maintenance`
History table + **Log maintenance** modal (extinguisher, action, date, issues,
notes, recommendations).

### 7. Reports — `/reports`
Tabbed (Inventory / Inspections / Compliance / Maintenance) with KPI tiles,
tables, and **Export PDF / CSV** buttons.

### 8. Profile — `/profile`
Edit personal info + change password.

### 9. Users (admin) — `/users`
User table with role badges; create/edit/delete with role + active toggle.

## Recreating in Figma

To produce Figma artboards from this spec: create frames at 1440×1024 (desktop)
and 390×844 (mobile), use the brand palette above, and lay out each screen per
the wireframes. The implemented components in `/frontend/components` define exact
spacing, typography (system/Helvetica), and colors.
