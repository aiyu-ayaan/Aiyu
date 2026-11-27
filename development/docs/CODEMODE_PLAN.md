# Code Mode for the admin APIs (Rust only)

Status: **implemented**. All 5 phases are built and verified. The old MCP server remains removed.

## Goal

An AI agent can read, and where allowed write, every admin section. It does this the Code Mode way: instead of one
tool per action, the agent writes a short script that searches the API description, then calls the APIs it needs.
New admin APIs become reachable by adding one catalog row.

Constraints:

- **Rust only.** Everything runs inside `aiyu-server`. No TypeScript Worker, no Node at run time.
- The old hand-built MCP server does not come back.
- Fits the current deployment: one container, read-only root filesystem, 1 GB VPS.

## What "Cloudflare Code Mode" means here

Cloudflare's SDK, [`@cloudflare/codemode`](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/),
is TypeScript. It runs model-written code in Dynamic Workers, which need a Workers Paid plan, and its OpenAPI helper
(`openApiMcpServer`) serves `search` and `execute` **as MCP tools**. That conflicts with the Rust-only constraint, so this
plan ports the *pattern* to Rust and does not use the Cloudflare package. No Cloudflare account feature is needed.

| Cloudflare | This plan |
|---|---|
| `search` and `execute` MCP tools | `POST /api/codemode/search`, `POST /api/codemode/execute` (or MCP, decision 1) |
| Dynamic Worker sandbox | embedded JavaScript engine in a child process |
| `codemode.spec()`, `codemode.request()` | the same two names and request shape |
| token kept in the host `request` function | token kept in the server process |
| about 6,000 tokens per response | 24,000 characters, then `--- TRUNCATED ---` |

The agent writes JavaScript. "Rust only" covers the server, not the scripts the model sends.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| **A (proposed)** | Native Rust, two HTTP endpoints | No MCP at all. Claude Desktop, Claude Code and other MCP clients cannot connect as tools; agents call HTTP, guided by a published skill. |
| B | Native Rust, `search` and `execute` as MCP tools | Closest to Cloudflare Code Mode, which is itself served over MCP. Works in MCP clients. Adds a small JSON-RPC layer. |
| C | Cloudflare Worker with `@cloudflare/codemode` | The official SDK, but TypeScript, paid plan, second deployment. Rejected: not Rust. |

## API

```http
POST /api/codemode/search
POST /api/codemode/execute
Authorization: Bearer aiyu_agent_…
Content-Type: application/json

{ "code": "async () => { … }" }
```

Reply: `{ "success": true, "result": …, "logs": [], "truncated": false }`.
Errors: `{ "success": false, "error": "…", "logs": [] }`.

Inside the sandbox:

- `search`: only `codemode.spec()`, the OpenAPI document filtered to what this token may call.
- `execute`: `codemode.spec()` and `codemode.request({ method, path, query, body })`.
- Nothing else: no network, files, environment, timers or modules.

Example:

```js
async () => {
  const { data } = await codemode.request({ method: "GET", path: "/api/blogs", query: { all: "true" } });
  return data.filter((post) => !post.published).map((post) => post.title);
}
```

The response shape in the example is illustrative; the catalog (phase 1) records the real one.

## Design

### Modules

| File | Job |
|---|---|
| `server/src/codemode/mod.rs` | the two routes, limits, audit |
| `server/src/codemode/catalog.rs` | the allow list: method, path pattern, scope, section, summary, parameters, allowed body fields, redactions. Generates the OpenAPI document |
| `server/src/codemode/sandbox.rs` | child process, JavaScript engine, message protocol |
| `server/src/codemode/token.rs` | agent tokens |

### Sandbox

- `aiyu-server codemode-sandbox` is a hidden subcommand. The server starts it for each run.
- Parent and child exchange one JSON message per line over stdin and stdout. `codemode.request` sends a message and
  blocks until the parent replies, so the engine needs no async host functions.
- The child starts with an empty environment. The parent sets a memory limit (`RLIMIT_AS`, via `libc`) and kills the
  child after a wall-clock timeout.
- Engine: [`boa_engine`](https://crates.io/crates/boa_engine), written in Rust. The alternative, `rquickjs`, wraps C
  code. Phase 2 starts with a spike to confirm `boa_engine` handles async arrow functions and runs within the limits.

The process boundary is deliberate: a runaway script, a memory blow-up or an engine panic ends the child, not the
site. It is a resource boundary, not a full OS sandbox; the engine exposing no I/O is what blocks file and network
access.

### Limits (starting values)

| Limit | Value |
|---|---|
| script size | 64 KB |
| wall clock | 30 s |
| child memory | 128 MB (two runs: 256 MB of the 1 GB) |
| `codemode.request` calls per run | 50 |
| router reply read by the parent | 2 MB, then an error asking for a narrower query |
| concurrent runs | 2 (others get 429) |
| runs per minute per IP | 30 |
| output | 24,000 characters |

### Auth

- New table `AgentToken` (new migration file; never edit `0001_init.sql`): hash, last 4, name, scope (`read` or
  `write`), expiry, created, last used. Add it to `db.rs` `TABLES`, and leave it out of backups.
- Created and revoked on `/admin/api-reference`, with a signed-in session only. Shown once.
- The token works **only** on `/api/codemode/*`. It is not accepted by any other route.
- For each `codemode.request` the parent:
  1. Validates the path: starts with `/api/`; no `..`, `//`, `%`, `?` or `#` (query goes in `query`).
  2. Matches method and path against the catalog and the token's scope. No match means refused. A catalog row can
     never point at `/api/codemode/*`, so a script cannot start another run.
  3. Rejects any body field the row does not list.
  4. Calls the real router in process (`tower::ServiceExt::oneshot`) with the caller's client address and a header
     holding a random per-process secret that `require_session` accepts. Handlers, validation and rate limits stay
     as they are; the token never enters the child.
  5. Applies the catalog's redactions to the reply.
- The outermost layer removes the internal secret header from every inbound request.
- Every write adds an audit entry: token name, method, path.

### Access per section

"Never" means the catalog has no row, so no token of any scope can call it.

| Admin section | Read | Write | Never |
|---|---|---|---|
| Dashboard | `version`, `health` | | |
| Home | `GET home` | `PUT home` | |
| About | `GET about` | `PUT about` | |
| Projects | `projects`, `projects/{id}`, `{id}/links` | create, update, delete, reorder | |
| Apps | `deployments`, `{id}`, `{id}/links` | create, update, delete, reorder | |
| Legal | `legal/apps`, `{id}`, `legal/documents/{id}` | apps and documents CRUD | |
| Blogs | `blogs?all=true`, `blogs/{id}` | create, update, delete | blog API token |
| Gallery | `gallery` | create, update, delete | |
| AI Hub | `ai-page`, `ai/*` | `ai/layout`, `ai/*` CRUD, `ai/seed` | |
| Resume Studio | `admin/resume` | save, compile, publish | |
| Header | `header` | `PUT header` | |
| Footer | `socials`, `socials/{id}` | CRUD | |
| Contact | `GET contact/message` | delete message | |
| Themes | `themes`, `themes/active`, `themes/{id}` | CRUD, activate | |
| Desktop, Terminal, Settings, Config | `GET config` (redacted) | `PUT config`, listed fields only | secret and webhook fields |
| Ads | `admin/ads` | `PUT admin/ads` | |
| Analytics | `admin/analytics` | | reset |
| SEO & Crawl | `admin/seo/config`, `admin/seo/audit` | config, `crawl`, `index`, `fix` | |
| Social & Metadata | `admin/social` | `PUT admin/social` | |
| Server Health | `health/metrics`, `uptime`, `targets` | targets, `uptime/check`, `analyze` | |
| GitHub | `github/stats`, `github/config`, `github/sync` | `PUT github/config` (no secrets), run sync | token, webhook secret, webhook |
| Cron Jobs | `crons` (env redacted), `logs`, `timezone` | `timezone` | create, edit, delete, run, `crons/env`, template preview (reads site data past the redactions) |
| Notifications | `admin/notifications` (URLs and tokens redacted) | | save, test |
| Security | `security/audit`, `security/sessions` | | revoke |
| Database | `gdrive/status`, `gdrive/list` | `gdrive/backup` | export, import, restore, delete, disconnect, OAuth, Drive config |
| Resources | `admin/storage`, `storage/migrate` preview, `admin/icons` | uploads (phase 4), purge cache | delete unreferenced, both migrations |
| AI Core | `ai/config`, `ai/models`, `ai/logs` | `ai/text`, `ai/generate` (cost money) | keys, provider validation |
| API Reference | `admin/system-prompt` | | all token management, `auth/*` |

Paths are relative to `/api/`.

## Security risks

| Risk | Control |
|---|---|
| Prompt injection: contact messages, analytics referrers and GitHub data are written by strangers, and an agent with write access reads them | tokens default to `read`; short expiry; audit log |
| Secrets reaching the model: cron reads return decrypted secrets, notification reads return webhook URLs and tokens, and the config document holds the sealed Google Drive settings | redactions in the catalog, each covered by a test; review every `GET` before adding its row |
| Planting a credential: `PUT config` writes any `Singleton` secret column the body names, including `blogApiTokenHash`, so a script could create a token that outlives its own | body field allow list on every write row |
| Exfiltration through writes that choose where data is sent (cron webhooks, notification channels, webhook URLs) | those writes are in "Never" |
| Personal data (contact messages, visitor analytics) sent to a model provider | owner's choice per token; documented on the token panel |
| Script exhausts the VPS | child process, memory and time limits, concurrency cap |
| Access control drifts from the router | deny by default; tests below |

## Phases

Each phase ends with `cargo test` passing.

1. **Catalog.** `catalog.rs` with read rows and redactions, plus the generated OpenAPI document.
   Tests: every row resolves on `router()` (not 404 or 405); every item in `navConfig.js` has a row; no "Never" route
   appears; redacted fields never appear in output.
2. **Sandbox and `search`.** Engine spike, child process, limits, `search`.
   Tests: infinite loop is killed; large allocation fails; no `fetch`, `process` or `require`.
3. **Tokens and read `execute`.** Migration, token panel, host request path, rate limit in `limited_api()`.
   Tests: bad paths refused; an inbound internal header is ignored; `/api/codemode/*` is not callable from a script; read token cannot write; agent token gets 401 on every normal route; revoked and expired
   tokens refused.
4. **Writes.** Write rows, audit entries, uploads as `codemode.upload({ name, type, base64 })` (the host builds the
   multipart request).
   Tests: one round trip per section; an audit row per write; no write row accepts a `Singleton` secret field.
5. **Docs.** Agent skill `aiyu-codemode` in `agentDiscovery.js`, `/auth.md`, `/docs/api`, `server/README.md`,
   admin API reference page.

## Decisions (resolved)

1. **Transport:** Approach A — plain HTTP (`POST /api/codemode/search` and `POST /api/codemode/execute`), no MCP.
2. **Engine:** `boa_engine` 0.22 with `IdleModuleLoader`, running in the hidden `aiyu-server codemode-sandbox` child process.
3. **Catalog:** 120 allow-listed catalog rows (53 `read` + 67 `write`) covering every admin section, with strict body-field allow lists on writes and explicit redactions on reads.
4. **Default token expiry:** 30 days, stored in `AgentToken` (`server/migrations/0002_agent_tokens.sql`, excluded from backup exports).
5. **Additional secret-redaction fixes landed during implementation:**
   - Patched `misc::sanitize` to strip `gdriveConfig`, `ai.gatewayApiKey`, and `ai.providers[].apiKey` so `GET /api/admin/system-prompt` never leaks secrets.
   - Redacted `n8nWebhookUrl` from config reads.
   - Redacted `sessions[].jti` from `GET /api/admin/security/sessions`.

## Already done: MCP removal

- Removed `/api/mcp`, `/api/admin/mcp/*`, `/.well-known/mcp/server-card.json`, `/docs/mcp`, `/admin/mcp`,
  `server/src/mcp.rs`, `src/lib/mcpConfig.js` and `docs/MCP_GUIDE.md`, plus references to them.
- The MCP write token no longer authorizes blog, upload or AI Hub writes. Use the blog API token.
- The `McpConfig` table stays, so existing databases and backups keep working. Nothing serves or edits it. Dropping
  it later needs a new migration and removal from `db.rs` `TABLES`.
- Kept: browser WebMCP (`WebMCPTools.js`, public navigation and search only, independent of the removed server), the
  CodeGraph developer tool config (`.mcp.json`), and portfolio text that mentions MCP as a skill.
- Outside the repository: delete the `_a2a._agents` DNS record if it was published (see `docs/DNS_AID.md`).
