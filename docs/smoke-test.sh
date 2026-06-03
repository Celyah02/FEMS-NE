#!/usr/bin/env bash
# End-to-end smoke test against a running stack (via the gateway).
# Usage: BASE=http://localhost:8080/api ./docs/smoke-test.sh
set -uo pipefail
BASE="${BASE:-http://localhost:8080/api}"
pass=0; fail=0
chk() { if [ "$1" = "$2" ]; then echo "  ✓ $3"; pass=$((pass+1)); else echo "  ✗ $3 (got '$2', want '$1')"; fail=$((fail+1)); fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "Gateway health:"; curl -s "${BASE%/api}/health"; echo

echo "Auth:"
TOKEN=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@tzw.com","password":"Password123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
[ -n "$TOKEN" ] && echo "  ✓ admin login" && pass=$((pass+1)) || { echo "  ✗ admin login"; fail=$((fail+1)); }
AUTH=(-H "Authorization: Bearer $TOKEN")

chk 401 "$(code "$BASE/extinguishers")" "unauth list → 401"
chk 200 "$(code "${AUTH[@]}" "$BASE/extinguishers")" "auth list → 200"
chk 401 "$(code -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@tzw.com","password":"wrong"}')" "bad password → 401"

echo "Reports:"
chk 200 "$(code "${AUTH[@]}" "$BASE/reports/summary")" "summary → 200"
chk 200 "$(code "${AUTH[@]}" "$BASE/reports/compliance")" "compliance → 200"
chk 200 "$(code "${AUTH[@]}" "$BASE/reports/inventory/export?format=csv")" "csv export → 200"
chk 200 "$(code "${AUTH[@]}" "$BASE/reports/compliance/export?format=pdf")" "pdf export → 200"

echo "RBAC:"
UTOK=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"user@tzw.com","password":"Password123!"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
chk 403 "$(code -H "Authorization: Bearer $UTOK" "$BASE/users")" "user → admin route → 403"

echo
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
