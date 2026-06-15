# Prisma Database Migration & Schema Update Guide

This document outlines the workflow and procedures for managing database schema modifications, running migrations, and updating seed data in the **Aiyu** project (Next.js + Prisma ORM + PostgreSQL).

---

## 1. Core Architecture: Relational vs. Json-Blob

Aiyu uses a hybrid data model design:
1. **Relational Models:** Models like `Blog`, `Project`, `Deployment`, `Gallery`, `ContactMessage`, `AiLog`, `Cron`, `CronLog`, `Social`, and `Theme`. These have real, typed PostgreSQL columns and are queried, filtered, or indexed. Modifying their fields requires a database schema migration.
2. **Json-Blob Singletons:** Models like `Config`, `Ads`, `About`, `Home`, `Header`, `NotificationConfig`, `GitHub`, and `CronEnv`. These store deeply nested config documents inside a single `data Json` column to prevent schema noise. Modifying their nested fields **does not** require database schema migrations.

---

## 2. Managing Json-Blob Singleton Changes (No DB Migration Needed)

Since singletons store their data inside a `data Json` column, adding or modifying fields (like adding `showcaseSection` to `Home`) requires no PostgreSQL schema changes.

### Step-by-Step Workflow:
1. **Update Default Values in Seed Script:**
   Modify `scripts/seed.mjs` to include the new JSON structure inside the default configuration object. For example:
   ```javascript
   await prisma.home.create({
     data: {
       data: {
         name: homeName,
         // ...
         showcaseSection: { eyebrow: "How I Work", panels: [...] }
       }
     }
   });
   ```
2. **Update Admin Form React Component:**
   Add matching input fields to `src/app/components/admin/HomeForm.js` to read and edit the new structure.
3. **Update Frontend Components:**
   Update your component (e.g., `src/app/components/landing/HomeShowcaseScroll.js`) to consume the new field dynamically.
4. **Re-seed (Optional/Fresh Setup):**
   Run the seed script to reset local DB to defaults:
   ```bash
   npm run db:seed
   ```

---

## 3. Managing Relational Model Changes (DB Migration Required)

When you need to add, remove, or modify a table column, table relationship, or index, you must perform a Prisma migration.

### Step 1: Modify the Prisma Schema
Edit `prisma/schema.prisma` to make the desired model adjustments. For example, to add an `authorEmail` column to the `Blog` model:
```prisma
model Blog {
  id          String   @id @default(cuid())
  title       String
  authorEmail String?  // Added column
  // ...
}
```

### Step 2: Generate and Apply Migration in Development
Run the migration generator tool. This will compare your schema against your local development database, generate a SQL migration file in `prisma/migrations/`, and apply it to your database.
```bash
npm run db:migrate
```
*Behind the scenes, this executes:* `npx prisma migrate dev`
Prisma will prompt you for a name for the migration. Enter a descriptive, snake_case name (e.g., `add_blog_author_email`).

### Step 3: Update Types & Re-generate Prisma Client
Prisma automatically runs `prisma generate` after `migrate dev`. If it does not, run:
```bash
npm run db:generate
```
This updates the Typescript types for the client so that your code knows about the new column.

### Step 4: Update the Seeder
If the new field is required or should have default values, update `scripts/seed.mjs` to match the new schema.

---

## 4. Deploying Migrations to Production

When deploying code changes to production or staging environments, **do not** run `prisma migrate dev`. Instead, apply the pre-generated SQL migration files to the database using:

```bash
npm run db:migrate:deploy
```
*Behind the scenes, this executes:* `npx prisma migrate deploy`

### Docker / Production Container Flow:
Our production container workflow automatically runs migrations before starting the Next.js server.
- The `Dockerfile` compiles the Next.js app and runs `prisma generate`.
- At container startup, the entrypoint script (`scripts/docker-entrypoint.sh`) runs `prisma migrate deploy` if the environment variable `RUN_MIGRATIONS=true` is set.

---

## 5. Critical Database Scripts Reference

| Command | Environment | Description |
|---|---|---|
| `npm run db:up` | Development | Spins up the local PostgreSQL and pgAdmin containers. |
| `npm run db:down` | Development | Shuts down the local PostgreSQL and pgAdmin containers. |
| `npm run db:migrate` | Development | Generates and applies a new SQL migration to the local database. |
| `npm run db:migrate:deploy` | Production | Applies pending SQL migrations to the database (safe for production). |
| `npm run db:seed` | Any | Wipes standard tables and re-seeds default data. |
| `npm run db:studio` | Development | Opens Prisma Studio UI in browser to inspect/edit table rows. |
| `npm run db:generate` | Any | Re-generates the JS/TS client queries/types based on schema. |

---

## 6. Guidelines & Best Practices

- **Never modify raw migration SQL directly** unless you specifically need to add custom PostgreSQL triggers or indexes (such as the Full-Text Search GIN index on `Blog`). If you must write raw SQL:
  1. Generate the migration using `npx prisma migrate dev --create-only`.
  2. Open the newly created `migration.sql` file and append your raw SQL (e.g., `CREATE TRIGGER...`).
  3. Run `npm run db:migrate` to apply it.
- **Always back up production databases** before executing `prisma migrate deploy`.
- **Cache Invalidation:** If your migration modifies page configurations or content, remember that the public endpoints cache results. After saving data through admin APIs, verify cache invalidation commands (e.g. `cache.invalidateAsync(...)`) run properly so that the changes propagate to visitor views.
