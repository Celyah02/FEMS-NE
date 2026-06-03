# User Manual — Fire Extinguisher Management System

This manual covers day-to-day use of the FEMS web application.

## 1. Roles

| Role | Can do |
|---|---|
| **Admin** | Everything: manage users, manage extinguishers, schedule & complete inspections, log maintenance, view all reports, send notifications |
| **Inspector** | Manage extinguishers, conduct & complete inspections, log maintenance, schedule inspections, view reports |
| **User** | View extinguisher status, schedule inspections, view inspection history & reports |

## 2. Getting started

### Register
1. Open the app (`http://localhost:3000`).
2. Click **Register**.
3. Enter First name, Last name, Email and a password (min 8 chars incl. a letter and a number).
4. New self-registered accounts get the **user** role. An admin can elevate you to inspector/admin.

### Log in
1. Click **Login**, enter your email and password.
2. On success you land on the **Dashboard**.

### Demo accounts
| Email | Password | Role |
|---|---|---|
| `admin@tzw.com` | `Password123!` | admin |
| `inspector@tzw.com` | `Password123!` | inspector |
| `user@tzw.com` | `Password123!` | user |

### Forgot password
1. On the Login page click **Forgot password**.
2. Enter your email; a reset token is issued (shown on screen in the demo).
3. Paste the token and set a new password.

## 3. Dashboard

Shows live KPIs:
- Total extinguishers and breakdown by status/type.
- Inspection counts: **pending / completed / overdue**.
- Compliance: **% compliant**, **expired**, **upcoming expirations**.
- Recent maintenance activity.

## 4. Fire extinguishers

- **List** — search by serial/location, filter by status or type.
- **View** — click a row to see full details and its inspection/maintenance history.
- **Add** (admin/inspector) — Serial number, Location, Type (Water/CO₂/Foam/Dry Chemical),
  Size (2.5/5/9/12 lb), Installation date, Expiry date, Status.
- **Edit** (admin/inspector) — update any field.
- **Delete** (admin).

## 5. Inspections

- **Schedule** — pick an extinguisher, choose date & time, optionally assign an
  inspector. The assigned inspector receives a notification.
- **List/filter** — by status (pending/completed/overdue/cancelled), extinguisher, inspector.
- **Complete** (admin/inspector) — record a result: **pass**, **fail**, or
  **needs maintenance**. A "needs maintenance" result moves the extinguisher to
  `maintenance` status; otherwise it returns to `active`.

## 6. Maintenance

- **Log maintenance** (admin/inspector) — choose the extinguisher (and optionally
  the related inspection), record Action taken, Date, Issues identified, Notes,
  and Recommendations.
- **History** — view all maintenance records, filterable by extinguisher and date.

## 7. Reports

Four report types, each viewable on screen and exportable to **PDF** or **CSV**:

- **Inventory** — totals; breakdown by status/type/size; daily/monthly/yearly summaries.
- **Inspections** — pending, completed, overdue.
- **Compliance** — expired units, upcoming expirations, overall compliance %.
- **Maintenance** — full history, frequency per unit, recent activity.

Click **Export PDF** or **Export CSV** on any report.

## 8. Notifications

The bell icon shows unread notifications (inspection assigned/completed,
compliance alerts). Click to mark as read, or **Mark all read**.

## 9. Profile

From the user menu:
- **View / edit profile** (name, email).
- **Change password** (requires current password).
- **Logout** (revokes your refresh token).

## 10. Tips

- Overdue inspections are computed automatically: a pending inspection whose
  scheduled date has passed becomes **overdue**.
- Expired extinguishers appear in the Compliance report and drive the dashboard
  compliance percentage.
