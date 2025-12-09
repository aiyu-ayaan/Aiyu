# Database Migration & Seeding

This project uses a seeding script to populate the MongoDB database with initial data. This script serves as the primary "migration" tool for development and initial setup.

## ⚠️ Important Warning

> [!WARNING]
> **The seed script is destructive.**
> Running the seed script will **DELETE ALL EXISTING DATA** in the following collections before repopulating them:
> - `projects`
> - `abouts`
> - `homes`
> - `headers`
> - `socials`

## Prerequisites

Ensure you have your environment variables set up in `.env.local` or a `.env` file. Specifically, you need `MONGODB_URI`.

```env
MONGODB_URI=your_mongodb_connection_string
```

## Running the Migration

To reset and seed the database with fresh data from the data files (e.g., `src/app/data/`), run the following command from the root of the project:

```bash
node scripts/seed.mjs
```

## What Gets Seeded?

The script populates the database with data from:
- `src/app/data/projectsData.js` -> Projects
- `src/app/data/aboutData.js` -> About
- `src/app/data/homeScreenData.js` -> Home
- `src/app/data/headerData.js` -> Header
- Static list (GitHub, LinkedIn, etc.) -> Socials
- Defaults if missing -> Config

If the script runs successfully, you will see:
`Database seeded successfully.`
