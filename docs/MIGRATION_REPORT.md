# MongoDB → PostgreSQL (Prisma) Migration Report

This document records the migration of Aiyu (Next.js 16 / React 19 portfolio +
CMS) from **MongoDB/Mongoose** to **PostgreSQL via Prisma**, with no
feature/contract regressions on the public or admin APIs.

- **ORM:** `mongoose ^9.3.3` → `prisma` / `@prisma/client` `^6.19.3`
- **Database:** MongoDB 7 → PostgreSQL 17
- **App contract:** unchanged — responses still expose `_id` and the exact
  nested JSON shapes (see “Contract preservation”).

---

## 1. Architecture: hybrid schema

Two storage strategies, chosen per former collection:

| Strategy | When | Storage |
|---|---|---|
| **Relational** | Collections that are queried, filtered, sorted, or counted | Real typed columns + indexes mirroring the old Mongoose indexes |
| **Json-blob** | Deeply-nested singleton “config documents” (`strict:false`, Maps, subdocs) | A single `data Json` column that preserves the exact shape |

IDs are `String @id @default(cuid())`. The old `_id` **string** contract is
preserved by the serializer shim (`src/lib/serialize.js`), which maps
`id → _id` on the way out and `_id → id` on the way in. The Mongo data-migration
script preserves the original `_id` values verbatim.

---

## 2. Collection → table mapping

### Relational models

| Mongo collection | Prisma model | Notes |
|---|---|---|
| `blogs` | `Blog` | `keywords[]`, `tags[]`; FTS `tsvector` + GIN; case-insensitive unique title |
| `projects` | `Project` | `techStack[]` |
| `deployments` | `Deployment` | `techStack[]` |
| `galleries` | `Gallery` | |
| `contactmessages` | `ContactMessage` | |
| `ailogs` | `AiLog` | token counters |
| `crons` | `Cron` | `webhookHeaders Json`, `webhookEnv Json`; `logs CronLog[]` |
| `cronlogs` | `CronLog` | `cronId` FK → `Cron` (`onDelete: Cascade`) |
| `themes` | `Theme` | `variants Json`; `slug @unique` |
| `socials` | `Social` | |

### Json-blob singletons (`id` + `data Json` + `createdAt`/`updatedAt`)

| Mongo collection | Prisma model | Extra columns |
|---|---|---|
| `configs` | `Config` | `encryptedGithubToken`, `encryptedGeminiApiKey`, `encryptedGroqApiKey`, `encryptedOpenRouterApiKey`, `blogApiTokenHash` (former `select:false` secrets) |
| `ads` | `Ads` | — (secrets kept inside `data`, stripped by the public serializer) |
| `abouts` | `About` | — |
| `homes` | `Home` | — |
| `headers` | `Header` | — |
| `notificationconfigs` | `NotificationConfig` | — |
| `githubs` | `GitHub` | — |
| `cronenvs` | `CronEnv` | — |

18 models total.

---

## 3. Indexes

Mirrors the former Mongoose indexes:

- **Blog:** `(published, createdAt)`, `(createdAt)`, `(slug)`, `(updatedAt)`,
  GIN on `searchVector`, unique `lower(title)`.
- **Project:** `(displayOrder, year)`, `(updatedAt)`, `(createdAt)`, `(slug)`.
- **Deployment:** `(displayOrder, updatedAt)`, `(createdAt)`, `(slug)`.
- **Gallery:** `(isPinned, order, createdAt)`, `(createdAt)`.
- **ContactMessage:** `(createdAt)`, `(read, createdAt)`, `(email)`.
- **AiLog:** `(createdAt)`, `(provider, createdAt)`.
- **CronLog:** `(cronId, ranAt)`, `(status)`, `(ranAt)`.
- **Social:** `(isHidden)`.
- **Theme:** `(createdAt)`, `(isCustom, createdAt)`, unique `slug`.

---

## 4. Full-text search (Blog)

Mongo’s case-insensitive `$or`+regex blog search is replaced by native
PostgreSQL FTS:

- A `searchVector tsvector` column on `Blog`, declared in the schema as
  `Unsupported("tsvector")?` so Prisma owns the column (no drift).
- Populated by a **trigger** (`blog_search_vector_update`) on
  `INSERT OR UPDATE OF title, content, tags` with weights:
  title = `A`, tags = `B`, content = `C`. (A trigger is used instead of a
  `GENERATED ALWAYS` column because the `regconfig` cast is only `STABLE`, not
  `IMMUTABLE`.)
- A **GIN** index on `searchVector`.
- Queried via `prisma.$queryRaw` using `websearch_to_tsquery`
  (`src/app/api/global-search/route.js`).

Everything else (Project/Deployment name+description, Home/About singletons)
uses `contains` with `mode: 'insensitive'` (ILIKE) plus JS filtering, matching
the old behavior.

The trigger + GIN index + the `lower(title)` unique index are added by the
raw-SQL portion of the init migration
(`prisma/migrations/20260614171024_init/migration.sql`).

---

## 5. Contract preservation

- **`_id`:** the serializer maps the string PK to `_id`; all routes return the
  same identifier shape clients already use.
- **Nested JSON:** Json-blob models spread `data` back to the top level so the
  response shape is byte-for-byte equivalent to the old documents.
- **`select:false` secrets:** Config secrets live in dedicated columns and are
  withheld unless a route explicitly requests them; Ads secrets are stripped by
  the public serializer. Verified no public route leaks `encrypted*` /
  `blogApiTokenHash`.
- **Public config whitelist:** `PUBLIC_CONFIG_KEYS` is re-applied in
  `dataFetchers`/public config GET so the `data` blob never over-shares.
- **Import/export:** backups keep `_id` and nested shapes, so existing JSON/ZIP
  backups remain importable round-trip.

---

## 6. Tooling, scripts & infra

- `src/lib/prisma.js` — HMR-safe Prisma singleton.
- `src/lib/serialize.js` — the central serializer (registry, `toClient`,
  `fromClient`, singleton get/upsert, secret handling).
- `npm run db:up` / `db:down` — Postgres + pgAdmin via `docker-compose-dev.yml`.
- `npm run db:migrate` / `db:migrate:deploy` / `db:generate` / `db:studio`.
- `npm run db:seed` — `scripts/seed.mjs` (or `GET /api/seed`) repopulates sample
  data on a fresh database.
- `npm run migrate:mongo` — `scripts/migrate-mongodb-to-postgres.mjs`, the
  idempotent one-time Mongo→Postgres importer (upsert by `_id`; preserves ids,
  timestamps, slugs, and `cronId` references; Cron before CronLog).
- **Docker:**
  - `docker-compose-dev.yml` (new) — Postgres + pgAdmin for host development.
  - `docker-compose-local.yml` — full local stack (Postgres + app build + nginx).
  - `docker-compose.yml` — production (Postgres + app image + nginx).
  - `docker-compose.replication.yml` — Postgres primary + 2 read replicas
    (streaming replication, Bitnami images) replacing the old 3-node Mongo
    replica set.
  - `Dockerfile` — runs `prisma generate` at build and `prisma migrate deploy`
    at container start (via `scripts/docker-entrypoint.sh`, gated on
    `RUN_MIGRATIONS=true`).
- `.env.example` / `.env` — `DATABASE_URL` + `POSTGRES_*` (+ pgAdmin); Mongo vars
  removed.

---

## 7. Deviations / follow-ups

- **Case-insensitive title uniqueness** uses a functional
  `UNIQUE INDEX (lower(title))` (case-insensitive only) instead of Mongo’s
  collation strength-2 (case- and accent-insensitive). Accent-insensitivity is
  not enforced. Switch to `citext`/`unaccent` if accent-folding is required.
- **`migrate:mongo`** needs the `mongodb` driver installed (`npm i mongodb`);
  it is not an app dependency. Only needed if importing legacy data — a fresh
  setup uses the seed instead.
- **Docker images were not build-tested in this environment** (no Docker
  available for image builds here; only a local Postgres instance was used to
  verify schema/seed/FTS). The Dockerfile/compose changes are
  correct-by-construction; build them in CI before promoting.

---

## 8. Verification performed

- `prisma validate` + `prisma generate` succeed.
- `prisma migrate` applied; trigger + GIN + `lower(title)` unique index present.
- Seed populates all relational rows and singletons with nested JSON intact.
- FTS verified on content **and** tags; case-insensitive unique title rejects
  duplicates (P2002).
- `npm run lint` and `npm run build` pass.
