# Model Context Protocol (MCP) & API Integration Guide

Welcome to the Aiyu Model Context Protocol (MCP) and API Integration Guide. This document provides a complete walkthrough of how to use and configure the MCP Server capabilities in your dashboard and how to consume or expose your resume/portfolio data to AI agents.

---

## 1. What is Model Context Protocol (MCP)?

The **Model Context Protocol (MCP)** is an open standard developed by Anthropic that enables Large Language Models (LLMs) and AI agents to connect securely to data sources and tools. 

Instead of writing custom API integration code for every single AI client, tool, or browser sandbox, MCP provides a unified way to describe:
- **Resources**: Data sources that an AI agent can read (similar to files or endpoints).
- **Tools**: Dynamic functions that an AI agent can execute (similar to calling a function).
- **Prompts**: Injected prompt templates or instructions that guide the AI agent's behavior.

When an AI agent (such as Claude Desktop, a browser-based agent, or Antigravity) connects to Aiyu, it discovers these capabilities automatically via a published **Server Card** served at `/.well-known/mcp/server-card.json`.

---

## 2. Using the `/admin/mcp` Dashboard

The `/admin/mcp` Command Center module is the control panel for your portfolio's MCP Server. It is split into seven configuration sections:

### 1. Server
This section sets the main metadata for your MCP Server.
- **Enabled Switch**: Master toggle. If disabled, the server card is still served, but no active tools or resources will be advertised.
- **Name**: Machine-readable identifier for your server (e.g., `aiyu`).
- **Version**: Version of your integration (e.g., `1.0.0`).
- **Title**: Display name shown to connecting clients (e.g., `Aiyu`).
- **Website URL**: Absolute link to your site.
- **Description**: High-level explanation of what your server does.
- **Instructions**: Guidelines sent directly to the connecting AI agent, advising it on *how* to use the server. This is a powerful way to steer the agent's behavior (e.g., "Always search the blog posts before answering general queries about the developer.").

### 2. Transports
Transports define *how* clients communicate with your MCP Server. Aiyu supports:
- **`webmcp`**: Direct, browser-level integration. When an agent is running inside the user's browser, Aiyu registers its tools directly to the browser runtime via `navigator.modelContext`.
- **`sse` (Server-Sent Events)**: Exposes a live streaming endpoint. Best for server-to-server connections where clients listen for updates and send actions over HTTP.
- **`http` / `streamable-http`**: Standard HTTP POST/GET endpoint structure.
- **`stdio`**: Standard input/output transport, used primarily when running Aiyu locally via command line.

### 3. Capabilities
Toggle which features of MCP are advertised to clients:
- **Tools**: Enable function calling.
- **Resources**: Enable reading raw data resources.
- **Prompts**: Enable loading prompt templates.
- **Logging**: Enable forwarding log events to the client.
- **Completions**: Enable auto-completing arguments.

### 4. Tools
Define the actions that AI agents can take on your site. Each tool has:
- **Name**: The identifier (e.g., `aiyu.navigate`).
- **Title / Description**: Details that help the LLM decide when to call the tool.
- **Input Schema**: A JSON schema representing the arguments the tool expects. For example:
  ```json
  {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  }
  ```
- **Annotations**: Flags like `readOnlyHint` (safe to call), `destructiveHint` (requires confirmation), or `idempotentHint` (safe to retry).

### 5. Resources
Expose read-only documents to the AI.
- **URI**: A unique URI string identifying the resource (e.g., `about://resume` or `http://localhost:3000/api/about`).
- **Name & Title**: Text describing the resource.
- **MimeType**: Identifies content structure (e.g., `application/json` or `text/markdown`).

### 6. Prompts
Define reusable system instructions that the user or agent can select (e.g., `write_cover_letter` prompt with arguments like `companyName` and `position`).

### 7. Links
Provide links that help agents discover API catalogs (`/.well-known/api-catalog`) or OpenAPI definitions (`/.well-known/openapi.json`).

---

## 3. How to Use & Expose Your Resume over API

Your resume and profile information are managed in the database via the **About** singleton and associated relational tables (Projects, Blogs). You can consume these via the REST API or configure them as MCP Resources.

### Method A: Consuming Resume Data via the REST API

You or your agent can query the portfolio content directly using the following public JSON endpoints:

1. **Get Resume Biography & Skills**:
   - **Endpoint**: `GET /api/about`
   - **Description**: Returns your bio, career history, education, and skill lists.
   - **Response Format**:
     ```json
     {
       "id": "cuid...",
       "data": {
         "name": "Your Name",
         "title": "Software Engineer",
         "bio": "...",
         "skills": ["React", "Next.js", "PostgreSQL"],
         "experience": [
           { "role": "Senior Developer", "company": "Tech Corp", "years": "2024-Present" }
         ]
       }
     }
     ```

2. **Get Projects**:
   - **Endpoint**: `GET /api/projects`
   - **Description**: Returns all public projects, including status, tech stacks, and live urls.

3. **Get GitHub Stats**:
   - **Endpoint**: `GET /api/github/stats`
   - **Description**: Returns the public stats configured in your GitHub module.

---

### Method B: Exposing Resume Data via MCP Resources

To make your resume immediately readable by any MCP-compliant AI client, follow these steps in the `/admin/mcp` panel:

1. Navigate to the **Resources** tab in `/admin/mcp`.
2. Click **+ RESOURCE**.
3. Configure the fields as follows:
   - **URI**: `about://resume`
   - **Enabled**: `ON`
   - **Name**: `resume`
   - **Title**: `Developer Resume & Biography`
   - **MimeType**: `application/json`
   - **Description**: `Fetches the primary developer bio, career history, and skill list.`
4. Click **SAVE** at the top right.

When an AI agent connects to your server card, it will find `about://resume` listed as an available resource. It can then request a resource read to ingest your full resume instantly.

---

### Method C: Connecting External Clients (e.g., Claude Desktop)

To connect an external client like **Claude Desktop** directly to your portfolio's MCP Server so it can access your resume:

1. Open your Claude Desktop configuration file:
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Add your Aiyu MCP server under the `mcpServers` key using our stdio server script:
   ```json
   {
     "mcpServers": {
       "aiyu-portfolio": {
         "command": "node",
         "args": [
           "--env-file=.env",
           "/absolute/path/to/aiyu/scripts/mcp-server.mjs"
         ]
       }
     }
   }
   ```
3. Alternatively, if your client supports remote HTTP/SSE servers, you can configure it to connect directly to your hosted `/api/mcp/sse` endpoint (once implemented) or fetch the `server-card.json` file for dynamic configuration.
