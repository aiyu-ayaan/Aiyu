# Internet Archive (Wayback Machine) Snapshot Task

How to configure the `Site to Internet Archive` webhook cron so it actually
archives the site, and why the old URL stopped working.

## TL;DR

Use the predefined **Internet Archive Snapshot** system task: put two keys in
`.env`, enable the task, done. No URL, header or body to hand-type.

```env
IA_ACCESS_KEY=...
IA_SECRET_KEY=...
```

The manual webhook route below is still supported, but every field is a
chance to mistype a placeholder; prefer the system task.

## Why the old task broke

Anonymous `GET /save/<url>` is no longer a supported Save Page Now entry
point. It only appears to work in a browser because a logged-in
`archive.org` session cookie rides along with the request. A server-side
fetch has no cookie, so the Internet Archive rejects it.

Observed responses:

```
https://me.aiyu.co.in/                        -> 200   (the site is fine)
GET  https://web.archive.org/save/<our-url>   -> 500   (HTML error shell)
GET  https://web.archive.org/save/example.com -> 429   (control URL fails too)
POST https://web.archive.org/save  (no auth)  -> 401
POST … -H "Authorization: LOW test:test"      -> {"message":"You need to be logged in to use Save Page Now."}
```

A control URL unrelated to this site fails identically, so nothing about
`me.aiyu.co.in` is being blocked. The replacement is the authenticated
**SPN2** API, which needs archive.org S3 keys.

## Option A (recommended): the predefined system task

`Internet Archive Snapshot` is seeded automatically as a system task, daily at
4:00 AM, **disabled**.

1. Generate S3 keys at <https://archive.org/account/s3.php>.
2. Put them in the deployment's environment (`.env`, or `prod.env` in Docker):

   ```env
   IA_ACCESS_KEY=your-access-key
   IA_SECRET_KEY=your-secret-key
   ```

3. Restart the app so the new variables are loaded.
4. Enable the task from `/admin/config/crons` (System Defined Tasks) and press
   **TRIGGER** once to confirm.

The task archives the site's own base URL — the same origin `$site` resolves
to — so there is nothing site-specific to configure. It reports the resolved
target, the SPN2 job id and a verification link in its log.

### The target URL comes from SITE_URL

`$site` and the snapshot task both resolve through
`lib/siteUrl.getSiteUrl()`, which reads:

```
SITE_URL  ||  NEXT_PUBLIC_BASE_URL  ||  https://me.aiyu.co.in
```

If neither variable is set in production you will archive whatever the
fallback is, so set `SITE_URL` in `prod.env`. (Before the fix in this change
`$site` read `NEXT_PUBLIC_SITE_URL`, a variable set nowhere in this repo, and
fell back to `http://localhost:3000` — templated webhooks built on `$site`
were pointing at localhost in production.)

If the keys are missing the task fails with the missing variable's name rather
than a bare `401`, so the Logs view says exactly what to add.

## Option B: a manual webhook task

Only needed to archive a URL other than the site root, or to keep credentials
in the encrypted cron env store rather than the environment.

### 1. Get archive.org S3 keys

1. Log in at <https://archive.org>.
2. Open <https://archive.org/account/s3.php> ("Archive.org S3 keys").
3. Copy the **access key** and **secret key**.

These are per-account, not per-site, and are the only credential SPN2 accepts.

### 2. Store the keys as cron environment variables

Add them in the **Environment Variables** manager on the crons admin page
(`/admin/config/crons`):

| Key | Value |
|---|---|
| `IA_ACCESS_KEY` | your access key |
| `IA_SECRET_KEY` | your secret key |

They are encrypted at rest (`src/app/api/admin/crons/env/route.js`) and
redacted from task logs by `redactEnvSecrets`, so the values never appear in
the Logs view.

> Use the **global** env manager, not a per-task env row. The runner loads
> only the global `cronEnv` singleton at execution time; per-task
> `webhookEnv` is stripped before the job runs
> (`src/utils/cronRunner.js`).

### 3. Configure the task

Edit `Site to Internet Archive`:

**Method** — `POST`. The body is only sent when the method is `POST`; a `GET`
task discards it.

**Target URL** — `https://web.archive.org/save` (no URL-appended target).

**Custom HTTP Request Headers**

| Key | Value |
|---|---|
| `Authorization` | `LOW $env.IA_ACCESS_KEY:$env.IA_SECRET_KEY` |
| `Accept` | `application/json` |
| `Content-Type` | `application/x-www-form-urlencoded` |

`Content-Type` **must** be set explicitly. The runner defaults every webhook
to `application/json`; the header row overrides it (header merging is
case-insensitive).

The `Authorization` value uses `$env.` placeholders, which resolve whether
the toggle says Fixed or Expression — any value containing `$` is compiled.
The `:` between the two keys is preserved literally, because the placeholder
pattern does not treat `:` as part of a variable name.

**Custom HTTP Request Body** — leave the toggle on **Fixed** and paste:

```
url=https://me.aiyu.co.in/&capture_all=1
```

This is the answer to "what goes in the body field": despite the
`{"status": "active"}` placeholder hint, the body is stored and transmitted
as a raw string with no JSON parsing or validation anywhere in the stack.
A form-urlencoded string is passed through byte for byte. `Fixed` is correct
here precisely because the value contains no `$`, so it is sent verbatim with
no template pass.

Optional body flags:

- `capture_all=1` — also archive pages that return an error status.
- `capture_screenshot=1` — store a screenshot alongside the snapshot.
- `skip_first_archive=1` — skip the slow first-archive check.
- `delay_wb_availability=1` — capture now, publish later (lighter on quota).

**Cron Interval** — `0 0 * * *` (daily at 12:00 AM) is fine and well under
any quota.

**Retry Mechanism** — keep retries low, 2 or 3. SPN2 enforces a
per-account concurrent-capture limit, and hammering it after a `429` extends
the lockout instead of clearing it. The previous `10x retries / 60s delay`
setting works against you here.

## Verify

Press **TRIGGER**, then open **Logs**. The log records the method, URL,
headers and body (secrets redacted) followed by the response.

Success looks like:

```
Webhook trigger returned HTTP status 200.
Response:
{"url":"https://me.aiyu.co.in/","job_id":"spn2-…"}
```

Confirm the snapshot landed at
<https://web.archive.org/web/*/me.aiyu.co.in> — a `job_id` means the capture
was queued, not that it finished.

## Common mistakes

**Wrapping the body in braces.** The body field's placeholder hint shows
`{"status": "active"}`, which invites this:

```
{ url=https://me.aiyu.co.in/&capture_all=1 }
```

The braces are sent literally. Archive.org then reads the first field name as
`{ url`, finds no `url` parameter, and rejects the request. The body is a raw
form-urlencoded string with no braces, quotes or surrounding whitespace:

```
url=https://me.aiyu.co.in/&capture_all=1
```

**Using `{{env.KEY}}` instead of `$env.KEY`.** This scheduler resolves
`$model.path` placeholders only; `{{ }}` is not a syntax it recognises and is
passed through untouched, so the literal text `{{env.IA_ACCESS_KEY}}` would be
sent as the credential and archive.org returns `401`.

The **Headers Preview (evaluated)** panel is the quickest check: it renders the
compiled value, so a value that comes back unchanged did not resolve. Note that
the panel prints resolved secrets on screen, so avoid sharing screenshots of it
once real keys are configured.

## Troubleshooting

| Response | Meaning | Fix |
|---|---|---|
| `401` `You need to be logged in…` | keys missing, wrong, or `Authorization` malformed | check the `LOW <access>:<secret>` shape and that both env keys exist |
| `429` | concurrent-capture or rate limit hit | lower retry count, wait, keep the daily schedule |
| `500` + HTML | still on the old `GET /save/<url>` form | switch to `POST https://web.archive.org/save` |
| `200` but no snapshot | capture queued or failed downstream | poll `https://web.archive.org/save/status/<job_id>` |

## Reference

- SPN2 client: `src/lib/webArchive.js` (+ `webArchive.test.js`)
- Runner: `src/utils/cronRunner.js` (`archive_snapshot` seed + branch, `webhook` branch)
- Template/placeholder resolution: `src/utils/cronTemplate.js`
- Env storage: `src/app/api/admin/crons/env/route.js`
- SPN2 API: <https://archive.org/details/spn-2-public-api-page>
