# Performance: memory, size and latency

Target: the whole site on a 1 GB VPS. Every milestone of the Rust + Vite migration is measured with the same
method, so numbers stay comparable.

## Method

1. Data: the local dev Postgres (`pnpm db:up`), about 15k rows (9.9k `AnalyticsEvent`, 2.4k `AiSkill`,
   2k `AnalyticsDaily`, 307 `Blog`) and 74 MB in `public/uploads`.
2. Build: production build on the same machine.
3. Start the server on port 3100, then run:

```bash
node --env-file=.env scripts/perf/bench.mjs --url http://localhost:3100 --pid <server pid> --backups 8
```

The bench reads RSS of the server process tree from `/proc`:
- `idle`: after start and one request
- `afterPublicWarmup`: after 10 requests to each of 14 public routes
- one row per backup: RSS after each full `/api/admin/export` (all collections + images)
- `after5sSettle`: 5 s after the last backup

Latency is p50 / p90 of 10 sequential requests on localhost (no network), so it measures server work only.

## Baseline: Next.js 16.4.1 (2026-11-24, master `10ba529`)

Build (`next build --webpack`): 63 s, peak build RSS **2.3 GB**. It cannot build on a 1 GB VPS.

| Size | Value |
|---|---|
| `.next` | 2.4 GB |
| `node_modules` | 1.2 GB |
| Client JS (all chunks) | 6.99 MB raw, 1.94 MB gzip |
| Client CSS | 352 KB |

| Memory (next-server RSS) | MB |
|---|---|
| Idle | 235 |
| After public warmup | 500 |
| Backup 1 / 2 / 3 / 4 / 5 / 6 / 7 / 8 | 821 / 851 / 883 / 866 / 803 / 855 / 853 / 834 |
| 5 s after last backup | 834 |

Each backup is a 75.7 MB zip and takes about 2.7 s. RSS jumps about 320 MB on the first backup and never goes
back: V8 keeps the grown heap and the process sits at 800+ MB. On a 1 GB VPS with Postgres beside it, that
means swap or the OOM killer.

Why the backup costs so much memory:
- `/api/admin/export` loads every table whole (`findMany()`), serializes it, and builds the zip in memory.
- `/api/admin/gdrive/backup` fetches that zip from itself over HTTP, then holds it three times:
  `arrayBuffer()`, `Buffer.from()`, and `Buffer.concat()` in `uploadBackupToDrive` (multipart body).
- Restore downloads the whole zip into a `Buffer` (`downloadDriveBackup`).

| Route | HTML/JSON bytes | p50 ms | p90 ms |
|---|---|---|---|
| `/` | 785,898 | 25.7 | 86.8 |
| `/about-me` | 423,759 | 15.3 | 22.0 |
| `/blogs` | **5,711,724** | 172.6 | 320.0 |
| `/projects` | 757,842 | 17.1 | 23.8 |
| `/gallery` | 820,161 | 27.6 | 35.3 |
| `/apps` | 389,229 | 14.7 | 17.9 |
| `/github` | 386,284 | 12.8 | 15.2 |
| `/contact-us` | 393,664 | 13.8 | 17.1 |
| `/ai` | 2,580,718 | 40.7 | 129.9 |
| `/desktop` | 53,964 | 13.4 | 28.9 |
| `/games` | 39,899 | 8.5 | 15.2 |
| `/sitemap.xml` | 75,481 | 12.8 | 25.4 |
| `/robots.txt` | 488 | 2.7 | 5.1 |
| `/api/config` | 337,204 | 3.8 | 5.9 |

Pages ship far more HTML than they show: `/blogs` embeds every blog's full content in the RSC payload
(5.7 MB), `/ai` embeds the whole skill list, and each page carries the 337 KB site config.

## Results per milestone

Filled in as milestones land. Same method, same data.

### Milestone 2: v1 removed (still Next.js)

| | Before | After |
|---|---|---|
| Client JS raw | 6.99 MB | 6.33 MB (-9%) |
| Client JS gzip | 1.94 MB | 1.76 MB (-9%) |
| Source files | | 67 files deleted (31 v1-only components, `src/app/v1`, version switch) |
| Server RSS idle / warm / after 3 backups | 235 / 500 / 834 MB | 286 / 532 / 867 MB (no change; within run-to-run noise) |

Server memory does not move: it is set by Next.js and the backup path, not by page count.

### Milestone 3: pnpm

CSS 352 KB -> 318 KB (Tailwind no longer scans markdown docs). Docker image (pnpm): 694 MB.

### Milestone 4: axum in front of Next

Release binary: 3.75 MB. Rust process RSS (Next still runs behind it, unchanged):

| Rust RSS | MB |
|---|---|
| Start | 4.7 |
| After public warmup | 6 |
| After 3 backups (75.7 MB each, streamed) | 8 |

Backups through Rust take the same time as direct (about 2.8 s) once zips are excluded from compression
(the first try brotli-compressed the zip: 6.3 s).

Compression (curl, one request; Next sends HTML uncompressed):

| Route | Next direct | Rust, brotli | Time Next / Rust |
|---|---|---|---|
| `/` | 785 KB | 272 KB | 14 / 26 ms |
| `/blogs` | 5.71 MB | 1.92 MB | 158 / 214 ms |

Brotli costs 10-50 ms of CPU per page and cuts bytes on the wire by 65%. The real fix for `/blogs` is not
shipping 5.7 MB of HTML, which comes with the page port.
