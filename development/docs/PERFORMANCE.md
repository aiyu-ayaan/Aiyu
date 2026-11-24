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

These are against local Next, which sends HTML uncompressed. Production nginx already gzips (level 6), so the
real gain over production is brotli vs gzip, smaller than these numbers. With the bench method (Node fetch,
10 sequential requests) p50 for `/` went from 22 ms (Next direct) to 85 ms through Rust and `/blogs` from 172 to
356 ms: on-the-fly compression of very large HTML. Brotli quality: Default and Precise(4) give the same size
(272 KB for `/`), Fastest doubles it (551 KB); Precise(4) is used. The real fix for `/blogs` is not shipping
5.7 MB of HTML, which comes with the page port.

Note: the 4.7-8 MB Rust RSS above is a fresh process under the sequential bench. Right after a Playwright run
an earlier build (8 worker threads) sat at about 87 MB; the runtime now defaults to 2 workers.

### Production image (Next.js, pnpm), before the backup work

`docker run` of the pnpm image against the dev Postgres, read-only root like docker-compose.yml:
idle 188 MB. Eight `POST /api/admin/gdrive/backup` (fails at the Drive token locally, after building and
buffering the export): 455 / 506 / 515 / 488 / 489 / 493 / 504 / 573 MB, 302 MB 10 s later. So each backup
spikes about 300 MB and the baseline creeps up (+115 MB after 8). In production the Drive upload buffers the zip
once more on top.

### Milestone 5: backups streamed

Where the memory went: the database part, not the images. Four `export?includeImages=false` calls (3.6 MB zip)
took Next from 213 to 486 MB; Prisma loads every table whole and `JSON.stringify` holds it all.

| Backup path (8 runs, local) | Next RSS | Rust RSS | Time per backup |
|---|---|---|---|
| Before (Next export, buffered) | 213 -> 486 MB, climbing | - | 1.5-3.2 s |
| After (Rust export, Next streams to a temp file) | 203 -> 278 -> 293 MB, flat | 9-16 MB | 0.85 s |

Rust export alone: 0.69 s vs 2.5 s for Node, Rust RSS 9.7 MB.

### Milestone 5a: Rust in the Docker image (Node 24)

Same `docker run` as the baseline image (read-only root, tmpfs `/tmp`), 8 Drive backups through the real route:

| Container | Idle | During 8 backups | 10 s after | Time per backup |
|---|---|---|---|---|
| Next only, Node 20 (before) | 188 MB | 455-573 MB | 302 MB | 2.7-3.2 s |
| Rust + Next, Node 20 | 196 MB | 275-402 MB | 303 MB | 28 s |
| Rust + Next, Node 24 | 287 MB* | 312-347 MB | 230 MB | 0.7 s |

\* idle measured after the smoke requests and seed, so Next was already warm.

The 28 s on Node 20 was `Readable.fromWeb` (web stream to file at ~2.7 MB/s); Node 20 is also past end of
life (April 2026), so the image now uses Node 24 LTS. In the container Rust holds 18 MB, Next the rest.
Image: 742 MB (Node 24 + Rust binary) vs 694 MB.

### Milestone 7: `/blogs` and `/blogs/[id]` served by Rust + Vite (2026-11-24)

Same machine and data, bench through Rust on :8080 (Next on :3100 serves the unported pages behind it).

| `/blogs` | Next (baseline) | Rust + Vite |
|---|---|---|
| HTML bytes | 5,711,724 | 389,240 (107 KB brotli) |
| p50 / p90 ms | 172.6 / 320.0 | 71.7 / 73.0 |

| Route | Bytes | p50 ms | p90 ms |
|---|---|---|---|
| `/blogs/<slug>` HTML | 29,130 | 12.8 | 15.1 |
| `/blogs/<slug>` JSON (client nav, `x-aiyu-data: 1`) | 12,037 | 12.5 | 15.6 |

- Vite JS: entry 488 KB (150 KB gzip), blog detail chunk 181 KB, loaded only on a post.
- The list query used to pull a 2 MB `data:` cover on every request; it now reads only the prefix (Rust RSS
  56 -> 45 MB after the bench, 16 MB right after start). Backups through Rust: 0.85-0.95 s each, RSS 43-52 MB.
- Remaining `/blogs` cost: ~21 ms SQL (2.5 MB of post content) + regex markdown stripping for read time on all
  307 posts. Next step if it matters: cache read time per post keyed on `updatedAt`.
- Release binary: 8.1 MB (was 3.75 MB; pulldown-cmark, ammonia, regex for the blog pages).

#### Two server fixes found by this bench

1. **TCP_NODELAY.** axum 0.8 leaves Nagle on for accepted sockets. With delayed ACK, every response on a
   kept-alive connection waited ~40 ms (curl, one connection: `/robots.txt` 42 ms through Rust vs 1 ms direct).
   The Milestone 4 "on-the-fly compression" slowdown above was mostly this. Fixed with `tap_io(set_nodelay)`.
2. **Next RSC prefetches.** Next prefetches every visible `<Link>`, including `[blogs]` in the header of every
   Next page. Rust rendered the whole 389 KB `/blogs` (77 ms) for each prefetch. Vite-owned routes now answer
   `RSC: 1` requests with an empty `text/plain` body (0.3 ms): Next then does a full page load on click.

Full bench through Rust after both fixes (Node fetch, kept-alive; bytes are decoded bytes):

| Route | Baseline Next p50 / p90 ms | Through Rust p50 / p90 ms | Bytes (baseline -> now) |
|---|---|---|---|
| `/` | 25.7 / 86.8 | 55.3 / 114.7 | 785,898 -> 1,090,731 |
| `/about-me` | 15.3 / 22.0 | 25.2 / 31.3 | 423,759 -> 430,298 |
| `/blogs` (Rust) | 172.6 / 320.0 | 82.6 / 148.7 | 5,711,724 -> 389,240 |
| `/projects` | 17.1 / 23.8 | 53.5 / 59.5 | 757,842 -> 1,146,322 |
| `/gallery` | 27.6 / 35.3 | 48.6 / 52.0 | 820,161 -> 833,980 |
| `/apps` | 14.7 / 17.9 | 26.2 / 31.9 | 389,229 -> 435,568 |
| `/github` | 12.8 / 15.2 | 21.9 / 26.8 | 386,284 -> 389,191 |
| `/contact-us` | 13.8 / 17.1 | 23.4 / 25.7 | 393,664 -> 396,533 |
| `/ai` | 40.7 / 129.9 | 78.0 / 127.1 | 2,580,718 -> 2,583,622 |
| `/desktop` | 13.4 / 28.9 | 11.4 / 22.2 | 53,964 -> 53,813 |
| `/games` (Rust) | 8.5 / 15.2 | 10.8 / 11.9 | 39,899 -> 8,464 |
| `/sitemap.xml` | 12.8 / 25.4 | 13.6 / 16.9 | 75,481 -> 80,114 |
| `/robots.txt` | 2.7 / 5.1 | 1.9 / 7.6 | 488 -> 488 |
| `/api/config` | 3.8 / 5.9 | 14.6 / 18.5 | 337,204 -> 337,142 |

- Proxied pages still cost ~10-40 ms more than Next direct: brotli of large HTML on the fly (Node fetch asks for
  it; Next direct sends it uncompressed). This goes away per page as pages are ported and shrink.
- `/` and `/projects` grew ~300-390 KB in Next itself (same bytes direct on :3100): `/` still embeds the base64
  resume PDF from config. Fix lands with the `/` port.
- RSS: Rust 8 MB idle, 25 MB after warmup + 3 backups (0.85-0.93 s each, 80 MB zip). Next 496 MB beside it.
  Total ~520 MB until Next is gone.
