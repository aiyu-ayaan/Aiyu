# Model Context Protocol (MCP) & API Integration Guide

This guide covers Aiyu's built-in **Model Context Protocol (MCP)** server implemented in `server/src/mcp.rs`, how to configure it from `/admin/mcp`, and how to connect AI clients.

---

## 1. Overview & Discovery Endpoints

Aiyu exposes a standard **MCP StreamableHTTP** JSON-RPC 2.0 server directly from the Rust/Axum backend—no separate sidecar or stdio script is required.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/mcp` | `POST` | MCP StreamableHTTP JSON-RPC 2.0 endpoint (single or batched requests) |
| `/api/mcp` | `DELETE` | Terminates an active session (`Mcp-Session-Id` header) → `204 No Content` |
| `/api/mcp` | `OPTIONS` | CORS preflight (`Access-Control-Allow-Origin: *`) |
| `/api/mcp` | `GET` | Returns `405 Method Not Allowed` (`Allow: POST, DELETE, OPTIONS`) |
| `/.well-known/mcp/server-card.json` | `GET` | Published MCP Server Card (metadata, transports, capabilities, read tools) |
| `/docs/mcp` | `GET` | Markdown MCP documentation for agents |
| `/.well-known/api-catalog` | `GET` | Public REST API catalog |
| `/.well-known/openapi.json` | `GET` | OpenAPI specification |

### Protocol & Sessions

- **Supported MCP Protocol Versions**: `2025-11-25` (default/latest), `2025-06-18`, `2025-03-26`, `2024-11-05`, `2024-10-07`.
- **Sessions**: Calling `initialize` returns an `Mcp-Session-Id` header. Include `Mcp-Session-Id` on subsequent requests (sessions expire after 30 minutes of inactivity). Send `DELETE /api/mcp` with `Mcp-Session-Id` to close a session explicitly.
- **Notifications**: JSON-RPC notifications (messages without an `id`) return `202 Accepted`.

---

## 2. Authentication & Rate Limiting

- **Read operations** (`tools/list`, read-only `tools/call`, `resources/*`, `prompts/*`): Public when the MCP server is enabled in `/admin/mcp`.
- **Write operations** (creating, updating, or deleting projects, blogs, deployments, or AI Hub items):
  1. Write access must be enabled in `/admin/mcp` (`write.enabled = true`).
  2. The client must send `Authorization: Bearer <token>`.
  3. Generate or revoke the bearer token in `/admin/mcp` (backed by `POST /api/admin/mcp/token` and `DELETE /api/admin/mcp/token`). Only the SHA-256 hash (`mcpTokenHash`) is stored in SQLite and verified in constant time.
  4. Write tools only appear in `tools/list` when **both** write access is enabled and the request carries a valid bearer token.
- **Rate Limits & Auditing**: Write tool calls are limited to **20 requests per minute per client IP** (in addition to the general `/api` rate limiter) and every write action is recorded in the admin security audit log.

---

## 3. Supported JSON-RPC Methods

| Method | Capability Flag | Description |
|---|---|---|
| `initialize` | always | Negotiates protocol version, returns `serverInfo`, `capabilities`, and optional `instructions` |
| `ping` | always | Liveness check (`{}`) |
| `tools/list` | `capabilities.tools.enabled` | Lists read tools (plus write tools if write mode is enabled and caller is authenticated) |
| `tools/call` | `capabilities.tools.enabled` | Executes a tool by `name` and `arguments` |
| `resources/list` | `capabilities.resources.enabled` | Lists built-in `aiyu://` resources |
| `resources/read` | `capabilities.resources.enabled` | Reads a resource by `uri` (`application/json`) |
| `prompts/list` | `capabilities.prompts.enabled` | Lists available prompt templates |
| `prompts/get` | `capabilities.prompts.enabled` | Renders a prompt template with optional arguments |

---

## 4. Available Tools, Resources & Prompts

### Read Tools (Public — 14 tools)

| Tool | Description | Required Args |
|---|---|---|
| `search_portfolio` | Search across projects, published blogs, and deployments | `query` |
| `list_projects` | List all portfolio projects with tech stack and links | — |
| `list_blogs` | List published blog post summaries | — |
| `get_blog` | Fetch a single published blog post by `id` or `slug` | `id` |
| `list_deployments` | List live deployments / hosted apps | — |
| `get_profile` | Fetch the developer About / resume profile | — |
| `get_api_catalog` | Fetch the public REST API catalog | — |
| `get_ai_page` | Fetch the full AI Hub (`/ai`) section configuration | — |
| `list_ai_sections` | List compact AI Hub section summaries | — |
| `get_ai_section` | Fetch a single AI Hub section by `id` | `id` |
| `list_ai_skills` | List AI Hub skills grouped by category | — |
| `list_ai_recommendations` | List recommended AI stack cards | — |
| `list_ai_credits` | List AI free-credits / free-tier rows | — |
| `list_ai_prompts` | List AI Hub prompt-library entries | — |

### Write Tools (Bearer Token + Write Enabled — 20 tools)

- **Projects**: `create_project`, `update_project`, `delete_project`
- **Blogs**: `create_blog_post` (defaults to `published: false` draft)
- **Deployments**: `create_deployment`
- **AI Hub Skill Categories**: `create_ai_skill_category`, `update_ai_skill_category`, `delete_ai_skill_category`
- **AI Hub Skills**: `create_ai_skill`, `update_ai_skill`, `delete_ai_skill`
- **AI Hub Recommendations**: `create_ai_recommendation`, `update_ai_recommendation`, `delete_ai_recommendation`
- **AI Hub Credits**: `create_ai_credit`, `update_ai_credit`, `delete_ai_credit`
- **AI Hub Prompts**: `create_ai_prompt`, `update_ai_prompt`, `delete_ai_prompt`

### Built-in Resources (`resources/read` — 10 URIs)

All resources return `application/json`:

- `aiyu://profile` — Developer About / resume profile
- `aiyu://projects` — All portfolio projects
- `aiyu://blogs` — Published blog post summaries
- `aiyu://deployments` — Live deployments / hosted apps
- `aiyu://api-catalog` — Public REST API catalog
- `aiyu://ai-page` — Full AI Hub (`/ai`) configuration
- `aiyu://ai-skills` — AI skills grouped by category
- `aiyu://ai-recommendations` — Recommended AI stack cards
- `aiyu://ai-credits` — Free credits & free-tier providers
- `aiyu://ai-prompts` — Reusable prompt library

### Built-in Prompts (`prompts/get`)

- `introduce_developer` — Instructs the client to read `aiyu://profile` and call `list_projects` to draft a developer introduction. Optional argument: `tone` (e.g., `"formal"` or `"casual"`).

---

## 5. Using the `/admin/mcp` Dashboard

The `/admin/mcp` panel manages your MCP server settings (stored in the `McpConfig` SQLite table):

- **Server**: Master enable/disable switch, `name`, `version`, `title`, `websiteUrl`, `description`, and agent `instructions`.
- **Write Access & Token**: Toggle write tools on/off and generate or revoke the Bearer token.
- **Transports**: Configure advertised transports (default: `streamable-http` at `/api/mcp`, plus optional `webmcp` browser integration).
- **Capabilities**: Toggle `tools`, `resources`, `prompts`, `logging`, and `completions`.
- **Tools / Resources / Prompts / Links**: Customize advertised server-card metadata and discovery links (`/.well-known/api-catalog`, `/.well-known/openapi.json`).

---

## 6. Connecting MCP Clients

### Remote StreamableHTTP Client Configuration

Point any MCP client that supports StreamableHTTP directly at `/api/mcp`:

```json
{
  "mcpServers": {
    "aiyu-portfolio": {
      "url": "https://your-domain.com/api/mcp"
    }
  }
}
```

To enable write tools, add the Bearer token generated in `/admin/mcp`:

```json
{
  "mcpServers": {
    "aiyu-portfolio": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_TOKEN"
      }
    }
  }
}
```

For local development against a running server (`pnpm dev` or `docker-compose.local.yml`), use `http://localhost:3000/api/mcp`.

### Testing with `curl`

```bash
# 1. Initialize a session (note the Mcp-Session-Id response header)
curl -i -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": { "protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": { "name": "curl", "version": "1.0" } }
  }'

# 2. List available tools
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <SESSION_ID>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 3. Call a read tool
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <SESSION_ID>" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_profile","arguments":{}}}'
```

---

## 7. Consuming Portfolio Data via REST API

If you prefer plain REST endpoints instead of MCP JSON-RPC, the same public data is available at:

- `GET /api/about` — Developer bio, skills, education, and experience
- `GET /api/projects` — All public projects
- `GET /api/blogs` — Published blog posts
- `GET /api/deployments` — Live deployments
- `GET /api/github/stats` — Cached GitHub stats
- `GET /api/ai-page` — AI Hub configuration
