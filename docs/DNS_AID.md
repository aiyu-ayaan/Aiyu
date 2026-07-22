# DNS for AI Discovery (DNS-AID)

DNS-AID lets an AI agent discover a site's agent entrypoints straight from DNS —
before it ever fetches a page — by publishing ServiceMode SVCB/HTTPS records
under a `_agents` label. This is **DNS-zone configuration**, not application
code: the records live in the authoritative zone for `aiyu.co.in`, so they are
published at the DNS provider (registrar / Cloudflare / Route 53), **not** in
this repository. This document is the source-of-truth template to apply there.

- Draft spec: https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/
- SVCB/HTTPS RR (SVCB, ServiceMode, params): https://www.rfc-editor.org/rfc/rfc9460

## What gets published

Two well-known entrypoints under `_agents.aiyu.co.in`, each an SVCB record in
**ServiceMode** (priority ≥ 1) whose target is the host that actually serves the
agent surface (`me.aiyu.co.in`):

| Owner name | Purpose | Endpoint served by this app |
|---|---|---|
| `_index._agents.aiyu.co.in` | Generic agent discovery index | `/.well-known/agent-skills/index.json`, `/.well-known/mcp/server-card.json` |
| `_a2a._agents.aiyu.co.in` | Agent-to-agent / MCP endpoint | `/.well-known/mcp/server-card.json` |

Both point clients at HTTPS on `me.aiyu.co.in`, which already serves the
discovery documents (`/.well-known/*`, `/auth.md`, `/docs/api`, `/docs/mcp`).

## Zone records (BIND / RFC 1035 presentation format)

```dns
; --- DNS for AI Discovery (DNS-AID) ---
; SVCB ServiceMode records. Priority 1 = ServiceMode (0 would be AliasMode).
; alpn advertises HTTP/2 + HTTP/1.1; port 443; endpoint carries the discovery path.

_index._agents.aiyu.co.in. 3600 IN SVCB 1 me.aiyu.co.in. (
    alpn="h2,http/1.1"
    port=443
    endpoint="/.well-known/agent-skills/index.json" )

_a2a._agents.aiyu.co.in.   3600 IN SVCB 1 me.aiyu.co.in. (
    alpn="h2,http/1.1"
    port=443
    endpoint="/.well-known/mcp/server-card.json" )
```

Notes:

- `endpoint=` is a DNS-AID key. Resolvers that don't know the key preserve it as
  an unknown SvcParam (`keyNNNNN=...`) — that's expected and interoperable.
- Some providers only expose the standard `HTTPS`/`SVCB` UI with numeric
  SvcParamKeys. If `endpoint` cannot be entered by name, use the numeric key
  reserved for it in the current draft and encode the value as its wire form; the
  agent surface is still reachable via the `/.well-known/*` paths regardless.
- If the target host differs per environment, change `me.aiyu.co.in` to match the
  host in `SITE_URL`.

## Provider quick-reference

- **Cloudflare** — DNS → Records → Add record → Type `HTTPS`/`SVCB`. Name
  `_index._agents` (Cloudflare appends the zone). Target `me.aiyu.co.in`,
  priority `1`, and add SvcParams `alpn`, `port`, `endpoint`.
- **Route 53** — Create record, type `HTTPS`, value
  `1 me.aiyu.co.in. alpn="h2,http/1.1" port=443 endpoint="..."`.
- **BIND / knot** — paste the block above into the zone file and bump the SOA
  serial.

## DNSSEC (required for authenticated discovery)

Sign the public zone so validating resolvers return authenticated answers and
agents can trust the discovered endpoints:

1. Enable DNSSEC for `aiyu.co.in` at the DNS provider (one click on Cloudflare /
   Route 53; `dnssec-signzone` or automatic signing on self-hosted BIND).
2. Publish the resulting **DS record** at the registrar so the chain of trust
   links from the parent zone.
3. Confirm the chain validates.

## Verify

```bash
# SVCB entrypoints
dig +short SVCB _index._agents.aiyu.co.in
dig +short SVCB _a2a._agents.aiyu.co.in

# DNSSEC chain (AD flag set on a validating resolver)
dig +dnssec SVCB _index._agents.aiyu.co.in | grep -E 'flags:.* ad|RRSIG'

# Endpoints the records point to (already served by this app)
curl -s https://me.aiyu.co.in/.well-known/agent-skills/index.json | head
curl -s https://me.aiyu.co.in/.well-known/mcp/server-card.json | head
```

## Rollout checklist

- [ ] Add the two SVCB records to the `aiyu.co.in` zone at the DNS provider.
- [ ] Confirm `dig SVCB _index._agents.aiyu.co.in` returns the record.
- [ ] Enable DNSSEC on the zone and publish the DS record at the registrar.
- [ ] Confirm the AD flag is set from a validating resolver.
- [ ] Re-run the agent-readiness scan.
