# API Testing

Three ways to exercise the API: **Swagger UI**, the **Postman collection**, or
**curl**. All examples assume the gateway at `http://localhost:8080`.

## 1. Swagger UI (interactive)

Each service serves its own contract:

| Service | Swagger UI |
|---|---|
| User / Auth | http://localhost:4001/docs |
| Extinguishers | http://localhost:4002/docs |
| Inspections & Maintenance | http://localhost:4003/docs |
| Reports | http://localhost:4004/docs |
| Notifications | http://localhost:4005/docs |

Use the **Authorize** button (top right) and paste an access token to call
protected endpoints.

## 2. Postman

Import [`postman_collection.json`](postman_collection.json). It has a `Login`
request that **automatically saves the access token** into the `{{accessToken}}`
collection variable, so subsequent requests are pre-authorized. Set the
`baseUrl` variable to `http://localhost:8080/api`.

## 3. curl walkthrough (smoke test)

```bash
BASE=http://localhost:8080/api

# Health
curl -s http://localhost:8080/health

# Login as admin → capture token
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tzw.com","password":"Password123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
echo "token: ${TOKEN:0:20}..."

# Register a new user
curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@tzw.com","password":"Password123!"}'

# List extinguishers (auth required)
curl -s $BASE/extinguishers -H "Authorization: Bearer $TOKEN"

# Create an extinguisher
curl -s -X POST $BASE/extinguishers -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"serialNumber":"FE-9001","location":"Test Lab","type":"co2","size":"5lb","installationDate":"2026-01-01","expiryDate":"2031-01-01"}'

# Schedule an inspection (use a real extinguisher id from the list)
curl -s -X POST $BASE/inspections -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"extinguisherId":"<EXT_ID>","scheduledDate":"2026-07-01","scheduledTime":"10:00"}'

# Reports
curl -s $BASE/reports/summary    -H "Authorization: Bearer $TOKEN"
curl -s $BASE/reports/compliance -H "Authorization: Bearer $TOKEN"

# Export a report to PDF / CSV
curl -s "$BASE/reports/inventory/export?format=csv" -H "Authorization: Bearer $TOKEN" -o inventory.csv
curl -s "$BASE/reports/compliance/export?format=pdf" -H "Authorization: Bearer $TOKEN" -o compliance.pdf
```

## 4. What to verify (test checklist)

**Auth & security**
- [ ] Register rejects duplicate email (409) and weak passwords (400).
- [ ] Login returns tokens; wrong password → 401.
- [ ] Protected routes without a token → 401.
- [ ] A `user` role calling an admin route (e.g. `GET /api/users`) → 403.
- [ ] Logout then reuse of the refresh token → 401 on `/auth/refresh`.
- [ ] Password reset issues a token and lets you set a new password.

**Extinguishers**
- [ ] CRUD happy paths; invalid enum (type/size/status) → 400.
- [ ] Duplicate serial number → 409.
- [ ] Filters: `?status=`, `?type=`, `?q=`, `?expiringInDays=`.

**Inspections & maintenance**
- [ ] Schedule creates an inspection and notifies the assigned inspector.
- [ ] Past pending inspections show as `overdue`.
- [ ] Complete with `needs_maintenance` moves the extinguisher to `maintenance`.
- [ ] Maintenance log creation requires inspector/admin.

**Reports & export**
- [ ] Summary/inventory/inspections/compliance/maintenance return expected shapes.
- [ ] PDF and CSV exports download for each report type.

A scripted version of the smoke test lives at
[`docs/smoke-test.sh`](smoke-test.sh).
