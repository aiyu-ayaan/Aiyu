# Moving an install from Postgres to SQLite

The server now keeps everything in one SQLite file (`DATABASE_PATH`, `/app/data/aiyu.db` in Docker). A new install
needs nothing from this page. An install that already has a Postgres database copies it once.

`aiyu-server import-postgres` reads Postgres in a single read-only snapshot and never changes it. It writes a new
file, compares every row by hash, and gives the file its final name only when all 36 tables match. It refuses to
overwrite an existing file. The server refuses to start while `DATABASE_URL` names Postgres and the SQLite file does
not exist, so an upgrade cannot come up as an empty site.

## Docker Compose

Keep `POSTGRES_PASSWORD` (and `POSTGRES_USER`, `POSTGRES_DB` if set) in `.env` until the copy is done. The Postgres
volume `postgres_data` is not touched by any step below.

1. Back up first, while the old version runs. In the admin panel, download a backup (Database page). Also dump
   Postgres:

   ```bash
   docker compose exec -T postgres pg_dump -U aiyu -d aiyu > aiyu-before-sqlite.sql
   ```

2. Note the image tag you run now (`APP_IMAGE_TAG`). It is the way back.
3. Stop the app so nothing writes during the copy:

   ```bash
   docker compose stop app
   ```

4. Update the checkout (new compose files), pull or build the new image, and start only Postgres:

   ```bash
   docker compose pull app
   docker compose --profile postgres up -d --wait postgres
   ```

   The last release on Postgres must have run against this database at least once, so that its migrations are
   applied. The import stops with a list of the missing columns when they are not.

5. Copy and verify:

   ```bash
   docker compose run --rm app import-postgres
   ```

   It prints one line per table and ends with `Copied and verified 36 tables, ... rows`. On any error nothing is kept:
   fix the cause and run it again, or go back to the old tag.

6. Start the new version and stop Postgres:

   ```bash
   docker compose --profile postgres stop postgres
   docker compose up -d
   ```

7. Check the site and the admin panel. Then remove `POSTGRES_*` from `.env`. Delete the `postgres_data` volume only
   when you are sure you will not go back.

## Going back

Set `APP_IMAGE_TAG` to the old tag, restore the old compose files and start. Postgres still holds the data as it was
at step 3. To keep changes made after the cutover, download a backup from the new version first and restore it in the
old one (the backup format is the same).

## Without Docker

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/aiyu pnpm server:build
DATABASE_URL=postgresql://user:password@localhost:5432/aiyu server/target/release/aiyu-server import-postgres
```

The file goes to `data/aiyu.db` unless `DATABASE_PATH` says otherwise.

## Known differences from Postgres

- Case-insensitive matching (search, duplicate blog titles) ignores case for ASCII letters only.
- Blog search uses SQLite's full-text index (English stemming). Ranking differs from Postgres.
- Rows that tie in a sort may come in another order.
