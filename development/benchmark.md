# Production Benchmark: `v6.1.0` vs `master`

Head-to-head comparison of the last Next.js + PostgreSQL release (`v6.1.0`, commit `0d2c01b`) against the Rust + Vite + SQLite release (`master`, commit `3bdc93b`).

- **Date:** 2026-11-27
- **Dataset:** `backup_2026-11-23_02-18-35.zip` (80 MB archive: 307 blogs, 67 gallery items, 6 AI skill categories, full analytics & uploads)
- **Script:** `scripts/perf/bench.mjs` (`--backups 5`)

## Methodology

1. Stopped all running Docker containers and local app processes so host resources were quiet.
2. Checked out `v6.1.0` into an isolated git worktree and built both production Docker images sequentially with `docker build --no-cache` using each version's own `Dockerfile`.
3. Tested each stack one at a time (tearing down `v6.1.0` + Postgres before starting `master`):
   - Started the production container(s) on an isolated Docker network with fresh volumes.
   - Restored the identical 80 MB backup ZIP via `POST /api/admin/import` and measured restore time and post-restore container memory.
   - Restarted the app container to measure clean idle RSS against the restored database.
   - Ran `scripts/perf/bench.mjs --backups 5` (10 sequential requests per route across 14 public routes, followed by 5 full `/api/admin/export` ZIP exports and a 5 s settle window).
   - Recorded `/proc/<pid>/status` RSS (entire process tree) and `docker stats` cgroup memory.

## Build, Image & Memory

| Metric | `v6.1.0` (Next.js + Postgres 17) | `master` (Rust + Vite + SQLite) | Delta |
|---|---:|---:|---:|
| Fresh `--no-cache` build time | 252 s | 382 s | +52% (Rust release LTO) |
| App Docker image size | 546 MB (+ ~275 MB Postgres) | **213 MB** (self-contained) | **-61%** (-74% total stack) |
| Backup restore time (80 MB ZIP) | 3,422 ms | **1,597 ms** | **2.1x faster** |
| Post-restore memory (cgroup) | 799.8 MiB app + 108.0 MiB pg = **907.8 MiB** | **97.7 MiB** | **-89%** |
| Idle RSS (app) | 282 MB | **21 MB** | **-93%** |
| After public warmup RSS (app) | 528 MB | **46 MB** | **-91%** |
| After 5x backup exports + 5 s settle RSS (app) | 613 MB (+ 108.8 MiB pg) | **51 MB** (35.8 MiB cgroup) | **-92%** (-93% total stack) |
| Backup export time (80 MB ZIP, avg of 5) | 2,736 ms | **808 ms** | **3.4x faster** |
| Database size on disk | Postgres volume | **18 MB** (`aiyu.db`) | — |

## Backup Export Runs (`/api/admin/export`)

| Run | `v6.1.0` Time | `v6.1.0` ZIP | `v6.1.0` RSS | `master` Time | `master` ZIP | `master` RSS |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2,803 ms | 79.5 MB | 580 MB | 875 ms | 80.2 MB | 43 MB |
| 2 | 2,789 ms | 79.5 MB | 596 MB | 798 ms | 80.2 MB | 43 MB |
| 3 | 2,710 ms | 79.5 MB | 605 MB | 790 ms | 80.2 MB | 47 MB |
| 4 | 2,690 ms | 79.5 MB | 608 MB | 785 ms | 80.2 MB | 47 MB |
| 5 | 2,686 ms | 79.5 MB | 613 MB | 793 ms | 80.2 MB | 51 MB |

## Public Routes: Payload & Latency

Latency is `p50 / p90` in milliseconds across 10 sequential localhost requests; bytes are decoded response sizes.

| Route | `v6.1.0` Bytes | `master` Bytes | Payload Delta | `v6.1.0` p50 / p90 (ms) | `master` p50 / p90 (ms) | p50 Speedup |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 1,088,979 | **54,421** | -95.0% | 41.7 / 221.4 | **6.1 / 47.9** | **6.8x** |
| `/about-me` | 430,296 | **17,173** | -96.0% | 23.8 / 30.7 | **2.0 / 2.3** | **11.9x** |
| `/blogs` | 5,698,386 | **389,168** | -93.2% | 205.9 / 312.6 | **45.9 / 49.9** | **4.5x** |
| `/projects` | 1,145,354 | **43,012** | -96.2% | 37.8 / 49.6 | **3.8 / 4.9** | **9.9x** |
| `/gallery` | 833,828 | **43,054** | -94.8% | 39.5 / 47.4 | **2.9 / 2.9** | **13.6x** |
| `/apps` | 435,740 | **27,112** | -93.8% | 20.7 / 24.0 | **2.4 / 2.8** | **8.6x** |
| `/github` | 388,851 | **11,362** | -97.1% | 18.8 / 20.8 | **1.4 / 2.0** | **13.4x** |
| `/contact-us` | 396,149 | **11,436** | -97.1% | 19.6 / 21.8 | **1.4 / 1.5** | **14.0x** |
| `/ai` | 2,582,896 | **36,063** | -98.6% | 57.8 / 123.9 | **17.3 / 21.4** | **3.3x** |
| `/desktop` | 53,310 | **11,553** | -78.3% | 15.0 / 23.7 | **1.9 / 2.9** | **7.9x** |
| `/games` | 39,354 | **8,436** | -78.6% | 10.5 / 12.8 | **1.0 / 1.3** | **10.5x** |
| `/sitemap.xml` | 80,486 | 80,486 | 0.0% | **15.1** / 23.2 | 21.3 / **22.3** | 0.7x |
| `/robots.txt` | 489 | 489 | 0.0% | 2.3 / 2.6 | **0.6 / 0.9** | **3.8x** |
| `/api/config` | 337,169 | 337,143 | 0.0% | **4.6 / 8.9** | 13.0 / 13.9 | 0.35x |

## Notes

- **1 GB VPS target:** `master` stays at **21 MB idle / 51 MB after 5 full backups** with no separate Postgres container. `v6.1.0` + Postgres climbs to **~722 MB** after backups and **~908 MB** during a restore.
- **Compression trade-off on `/api/config` and `/sitemap.xml`:** `master` brotli-compresses responses on the fly (Node's `fetch` sends `Accept-Encoding: br`), whereas `v6.1.0` Next.js standalone returned those payloads uncompressed on localhost. Over the wire this saves bandwidth at the cost of ~8 ms of CPU time on the 337 KB config JSON.
- **Build time:** `master` takes longer on a completely cold `--no-cache` Docker build (382 s vs 252 s) due to compiling the Rust release binary with LTO, but ships a 61% smaller app image with no Node.js or PostgreSQL runtime required.
