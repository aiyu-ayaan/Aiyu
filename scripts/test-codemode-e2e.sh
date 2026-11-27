#!/usr/bin/env bash
set -euo pipefail

# End-to-end smoke test for Code Mode against a live aiyu-server release binary.
# Uses an isolated temporary SQLite database and dummy credentials; never reads .env or data/aiyu.db.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_BIN="${SERVER_BIN:-${REPO_ROOT}/server/target/release/aiyu-server}"
PORT="${PORT:-18089}"
BASE_URL="http://127.0.0.1:${PORT}"

for tool in curl jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "FAIL: required tool '$tool' is not installed" >&2
    exit 1
  fi
done

if [[ ! -x "$SERVER_BIN" ]]; then
  echo "FAIL: server binary not found or not executable at: $SERVER_BIN" >&2
  echo "Build it first with: cargo build --release --manifest-path server/Cargo.toml" >&2
  exit 1
fi

if [[ ! -f "${REPO_ROOT}/web/dist/index.html" ]]; then
  echo "FAIL: web/dist/index.html not found; run 'pnpm web:build' first" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/aiyu-codemode-e2e.XXXXXX")"
COOKIE_JAR="${TMP_DIR}/cookies.txt"
SERVER_LOG="${TMP_DIR}/server.log"
SERVER_PID=""

cleanup() {
  local exit_code=$?
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  if [[ $exit_code -ne 0 && -f "${SERVER_LOG}" ]]; then
    echo "--- server log tail ---" >&2
    tail -n 40 "${SERVER_LOG}" >&2 || true
  fi
  rm -rf "${TMP_DIR}"
  exit "$exit_code"
}
trap cleanup EXIT

PASS_COUNT=0
pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '[PASS %02d] %s\n' "$PASS_COUNT" "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  exit 1
}

post_codemode() {
  local endpoint="$1"
  local token="$2"
  local code="$3"
  local max_time="${4:-20}"
  local payload
  payload="$(jq -n --arg code "$code" '{ code: $code }')"
  curl -sS --max-time "$max_time" \
    -X POST "${BASE_URL}${endpoint}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

echo "Starting isolated aiyu-server on ${BASE_URL} (temp dir: ${TMP_DIR})..."
mkdir -p "${TMP_DIR}/uploads"

# Run inside TMP_DIR so dotenvy never reads any .env file from REPO_ROOT.
(
  cd "${TMP_DIR}"
  exec env -i \
    PATH="${PATH}" \
    HOME="${TMP_DIR}" \
    NODE_ENV="development" \
    RUST_LISTEN="127.0.0.1:${PORT}" \
    DATABASE_PATH="${TMP_DIR}/e2e.db" \
    UPLOADS_DIR="${TMP_DIR}/uploads" \
    WEB_DIR="${REPO_ROOT}/web/dist" \
    PUBLIC_DIR="${REPO_ROOT}/public" \
    PACKAGE_JSON="${REPO_ROOT}/package.json" \
    JWT_SECRET="codemode-e2e-dummy-jwt-secret-0123456789abcdef" \
    ADMIN_USERNAME="e2etest" \
    ADMIN_PASSWORD="TestPassword123!" \
    GITHUB_AUTH_ENABLED="false" \
    RUN_SEED="false" \
    CRON_ENABLED="false" \
    RUST_LOG="info" \
    "${SERVER_BIN}"
) >"${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

# Wait for /api/health
READY=0
for _ in $(seq 1 50); do
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    fail "server exited prematurely during startup"
  fi
  if curl -sf --max-time 2 "${BASE_URL}/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.2
done
[[ "$READY" -eq 1 ]] || fail "server did not become healthy at ${BASE_URL}/api/health"
pass "Server started cleanly on ${BASE_URL} with isolated SQLite DB"

# 1. Sign in as test admin
LOGIN_RESP="$(curl -sS --max-time 10 -c "${COOKIE_JAR}" \
  -X POST "${BASE_URL}/api/auth/login" \
  --data-urlencode "username=e2etest" \
  --data-urlencode "password=TestPassword123!")"
echo "$LOGIN_RESP" | jq -e '.success == true' >/dev/null || fail "admin login failed: ${LOGIN_RESP}"
pass "Admin login succeeded and session cookie saved"

# 2. Create read and write agent tokens
READ_TOKEN_RESP="$(curl -sS --max-time 10 -b "${COOKIE_JAR}" \
  -X POST "${BASE_URL}/api/admin/codemode/tokens" \
  -H "Content-Type: application/json" \
  -d '{"name":"e2e-read-token","scope":"read"}')"
READ_TOKEN="$(echo "$READ_TOKEN_RESP" | jq -r '.token // empty')"
READ_TOKEN_ID="$(echo "$READ_TOKEN_RESP" | jq -r '.item.id // empty')"
[[ "$READ_TOKEN" == aiyu_agent_* && -n "$READ_TOKEN_ID" ]] || fail "read token creation failed: ${READ_TOKEN_RESP}"

WRITE_TOKEN_RESP="$(curl -sS --max-time 10 -b "${COOKIE_JAR}" \
  -X POST "${BASE_URL}/api/admin/codemode/tokens" \
  -H "Content-Type: application/json" \
  -d '{"name":"e2e-write-token","scope":"write"}')"
WRITE_TOKEN="$(echo "$WRITE_TOKEN_RESP" | jq -r '.token // empty')"
WRITE_TOKEN_ID="$(echo "$WRITE_TOKEN_RESP" | jq -r '.item.id // empty')"
[[ "$WRITE_TOKEN" == aiyu_agent_* && -n "$WRITE_TOKEN_ID" ]] || fail "write token creation failed: ${WRITE_TOKEN_RESP}"
pass "Created read token (${READ_TOKEN_ID}) and write token (${WRITE_TOKEN_ID})"

# 3. Search spec with both tokens
SEARCH_CODE='async () => {
  const spec = codemode.spec();
  const paths = Object.keys(spec.paths || {});
  const methods = new Set();
  for (const p of paths) {
    for (const m of Object.keys(spec.paths[p])) methods.add(m.toLowerCase());
  }
  return {
    openapi: spec.openapi,
    pathCount: paths.length,
    hasProjects: Boolean(spec.paths["/api/projects"]),
    hasPostProjects: Boolean(spec.paths["/api/projects"] && spec.paths["/api/projects"].post),
    hasUploadExt: Boolean(spec["x-codemode-upload"]),
    methods: Array.from(methods).sort(),
  };
}'

READ_SEARCH="$(post_codemode "/api/codemode/search" "$READ_TOKEN" "$SEARCH_CODE")"
echo "$READ_SEARCH" | jq -e '
  .success == true
  and .result.openapi == "3.1.0"
  and .result.hasProjects == true
  and .result.hasPostProjects == false
  and .result.hasUploadExt == false
  and (.result.methods == ["get"])
' >/dev/null || fail "read token search spec check failed: ${READ_SEARCH}"

WRITE_SEARCH="$(post_codemode "/api/codemode/search" "$WRITE_TOKEN" "$SEARCH_CODE")"
echo "$WRITE_SEARCH" | jq -e '
  .success == true
  and .result.openapi == "3.1.0"
  and .result.hasProjects == true
  and .result.hasPostProjects == true
  and .result.hasUploadExt == true
' >/dev/null || fail "write token search spec check failed: ${WRITE_SEARCH}"
pass "Search spec verified for read token (GET-only, no upload) and write token (writes + x-codemode-upload)"

# 4. Read one route per admin section (all 28 sections in CODEMODE_PLAN.md)
ALL_SECTIONS_CODE='async () => {
  const checks = [
    ["Dashboard", "/api/version"],
    ["Home", "/api/home"],
    ["About", "/api/about"],
    ["Projects", "/api/projects"],
    ["Apps", "/api/deployments"],
    ["Legal", "/api/legal/apps"],
    ["Blogs", "/api/blogs", { all: "true" }],
    ["Gallery", "/api/gallery"],
    ["AI Hub", "/api/ai-page"],
    ["Resume Studio", "/api/admin/resume"],
    ["Header", "/api/header"],
    ["Footer", "/api/socials"],
    ["Contact", "/api/contact/message"],
    ["Themes", "/api/themes"],
    ["Config", "/api/config"],
    ["Ads", "/api/admin/ads"],
    ["Analytics", "/api/admin/analytics"],
    ["SEO & Crawl", "/api/admin/seo/config"],
    ["Social & Metadata", "/api/admin/social"],
    ["Server Health", "/api/admin/health/metrics"],
    ["GitHub", "/api/github/config"],
    ["Cron Jobs", "/api/admin/crons"],
    ["Notifications", "/api/admin/notifications"],
    ["Security", "/api/admin/security/audit"],
    ["Database", "/api/admin/gdrive/status"],
    ["Resources", "/api/admin/storage"],
    ["AI Core", "/api/admin/ai/config"],
    ["API Reference", "/api/admin/system-prompt"],
  ];
  const failures = [];
  for (const [section, path, query] of checks) {
    const req = query ? { method: "GET", path, query } : { method: "GET", path };
    const res = await codemode.request(req);
    if (res.status < 200 || res.status >= 300) {
      failures.push({ section, path, status: res.status });
    }
  }
  return { total: checks.length, failures };
}'

SECTIONS_RESP="$(post_codemode "/api/codemode/execute" "$READ_TOKEN" "$ALL_SECTIONS_CODE")"
echo "$SECTIONS_RESP" | jq -e '.success == true and .result.total == 28 and (.result.failures | length) == 0' >/dev/null \
  || fail "all-sections read check failed: ${SECTIONS_RESP}"
pass "Read 1 route across all 28 admin sections via POST /api/codemode/execute"

# 5. Create, update, and delete a test project with write token + verify AuditLog
CRUD_CODE='async () => {
  const created = await codemode.request({
    method: "POST",
    path: "/api/projects",
    body: {
      name: "E2E Smoke Project",
      slug: "e2e-smoke-project",
      year: "2026",
      status: "Active",
      projectType: "Web",
      description: "Created by test-codemode-e2e.sh"
    }
  });
  const id = created.data && (created.data._id || created.data.id);
  if (created.status !== 201 || !id) {
    throw new Error("create failed: " + JSON.stringify(created));
  }

  const updated = await codemode.request({
    method: "PUT",
    path: "/api/projects/" + id,
    body: { name: "E2E Smoke Project Updated" }
  });
  if (updated.status !== 200 || !updated.data || updated.data.name !== "E2E Smoke Project Updated") {
    throw new Error("update failed: " + JSON.stringify(updated));
  }

  const deleted = await codemode.request({
    method: "DELETE",
    path: "/api/projects/" + id
  });
  if (deleted.status !== 200) {
    throw new Error("delete failed: " + JSON.stringify(deleted));
  }

  return { id, updatedName: updated.data.name, deletedStatus: deleted.status };
}'

CRUD_RESP="$(post_codemode "/api/codemode/execute" "$WRITE_TOKEN" "$CRUD_CODE")"
echo "$CRUD_RESP" | jq -e '.success == true and (.result.id | length) > 0 and .result.deletedStatus == 200' >/dev/null \
  || fail "project CRUD via execute failed: ${CRUD_RESP}"
PROJECT_ID="$(echo "$CRUD_RESP" | jq -r '.result.id')"

AUDIT_RESP="$(curl -sS --max-time 10 -b "${COOKIE_JAR}" \
  "${BASE_URL}/api/admin/security/audit?category=codemode&limit=20")"
echo "$AUDIT_RESP" | jq -e --arg pid "$PROJECT_ID" '
  (.logs | map(select(.action == "CODEMODE_WRITE" and (.details | contains("e2e-write-token")))) | length) >= 3
  and (.logs | any(.details | contains("POST /api/projects")))
  and (.logs | any(.details | contains("PUT /api/projects/" + $pid)))
  and (.logs | any(.details | contains("DELETE /api/projects/" + $pid)))
' >/dev/null || fail "expected CODEMODE_WRITE audit entries not found: ${AUDIT_RESP}"
pass "Project create/update/delete succeeded with write token and AuditLog recorded all 3 writes"

# 6. Forbidden ("Never") routes refused for BOTH read and write tokens
NEVER_EXPORT_CODE='async () => await codemode.request({ method: "GET", path: "/api/admin/export" })'
NEVER_CRON_CODE='async () => await codemode.request({ method: "POST", path: "/api/admin/crons", body: { name: "evil" } })'

for label_tok in "read:${READ_TOKEN}" "write:${WRITE_TOKEN}"; do
  label="${label_tok%%:*}"
  tok="${label_tok#*:}"
  r1="$(post_codemode "/api/codemode/execute" "$tok" "$NEVER_EXPORT_CODE")"
  echo "$r1" | jq -e '.success == false' >/dev/null || fail "GET /api/admin/export should be refused for ${label}: ${r1}"
  r2="$(post_codemode "/api/codemode/execute" "$tok" "$NEVER_CRON_CODE")"
  echo "$r2" | jq -e '.success == false' >/dev/null || fail "POST /api/admin/crons should be refused for ${label}: ${r2}"
done
pass "Forbidden ('Never') routes refused for both read and write tokens"

# 7. Write route refused for read token
READ_WRITE_CODE='async () => await codemode.request({ method: "POST", path: "/api/projects", body: { name: "Nope", slug: "nope", year: "2026", status: "Active", projectType: "Web", description: "no" } })'
READ_WRITE_RESP="$(post_codemode "/api/codemode/execute" "$READ_TOKEN" "$READ_WRITE_CODE")"
echo "$READ_WRITE_RESP" | jq -e '.success == false' >/dev/null || fail "POST /api/projects should be refused for read token: ${READ_WRITE_RESP}"
pass "Write route (POST /api/projects) refused for read-scoped token"

# 8. Agent token directly on normal admin route -> HTTP 401
DIRECT_STATUS="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer ${WRITE_TOKEN}" \
  "${BASE_URL}/api/admin/crons")"
[[ "$DIRECT_STATUS" == "401" ]] || fail "agent token on /api/admin/crons expected 401, got ${DIRECT_STATUS}"
pass "Agent token rejected with HTTP 401 on normal admin route (/api/admin/crons)"

# 9. Forged x-aiyu-codemode-internal header -> HTTP 401
FORGED_STATUS="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' \
  -H "x-aiyu-codemode-internal: forged-secret-value" \
  "${BASE_URL}/api/admin/crons")"
[[ "$FORGED_STATUS" == "401" ]] || fail "forged internal header on /api/admin/crons expected 401, got ${FORGED_STATUS}"
pass "Forged x-aiyu-codemode-internal header stripped and rejected with HTTP 401"

# 10. Infinite loop killed by server timeout (default 30s), followed by a healthy search
echo "Running infinite loop timeout test (up to ~30s)..."
LOOP_RESP="$(post_codemode "/api/codemode/search" "$READ_TOKEN" 'async () => { while (true) {} }' 45)"
echo "$LOOP_RESP" | jq -e '.success == false and (.error | ascii_downcase | contains("timed out"))' >/dev/null \
  || fail "infinite loop was not killed with timeout error: ${LOOP_RESP}"

POST_LOOP_RESP="$(post_codemode "/api/codemode/search" "$READ_TOKEN" 'async () => ({ recovered: true, sum: 2 + 2 })')"
echo "$POST_LOOP_RESP" | jq -e '.success == true and .result.recovered == true and .result.sum == 4' >/dev/null \
  || fail "post-timeout search failed: ${POST_LOOP_RESP}"
pass "Infinite loop killed by wall-clock timeout and server recovered cleanly for next run"

# 11. Revoke token and verify subsequent /api/codemode/search returns HTTP 401
REVOKE_RESP="$(curl -sS --max-time 10 -b "${COOKIE_JAR}" \
  -X DELETE "${BASE_URL}/api/admin/codemode/tokens/${READ_TOKEN_ID}")"
echo "$REVOKE_RESP" | jq -e '.success == true' >/dev/null || fail "token revoke failed: ${REVOKE_RESP}"

REVOKED_STATUS="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' \
  -X POST "${BASE_URL}/api/codemode/search" \
  -H "Authorization: Bearer ${READ_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"code":"async () => 1"}')"
[[ "$REVOKED_STATUS" == "401" ]] || fail "revoked token expected HTTP 401, got ${REVOKED_STATUS}"
pass "Revoked token rejected with HTTP 401 on POST /api/codemode/search"

echo ""
echo "ALL ${PASS_COUNT} CODE MODE E2E CHECKS PASSED!"
