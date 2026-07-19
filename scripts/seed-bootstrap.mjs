// Container-side seed bootstrap, invoked by docker-entrypoint.sh.
//
// Modes (RUN_SEED):
//   auto  - seed only when the database looks empty (fresh volume / new server).
//           This is the safe default: `seed.mjs` starts with deleteMany() calls,
//           so it must never run unattended against a populated database.
//   force - always run the full seeder, wiping and re-seeding the base tables.
//   false/unset - do nothing.
//
// Both the base seeder and the idempotent AI-section backfill are imported for
// their side effects; each manages its own PrismaClient.
import { PrismaClient } from '@prisma/client';

const mode = (process.env.RUN_SEED || '').toLowerCase();
if (mode !== 'auto' && mode !== 'force' && mode !== 'true') {
    process.exit(0);
}

const prisma = new PrismaClient();

async function isEmpty() {
    const [projects, abouts, homes] = await Promise.all([
        prisma.project.count(),
        prisma.about.count(),
        prisma.home.count(),
    ]);
    return projects === 0 && abouts === 0 && homes === 0;
}

try {
    if (mode !== 'force') {
        const empty = await isEmpty();
        if (!empty) {
            console.log('[seed] Database already has data; skipping (RUN_SEED=force overrides).');
            process.exit(0);
        }
        console.log('[seed] Empty database detected; running initial seed...');
    } else {
        console.log('[seed] RUN_SEED=force; re-seeding base tables...');
    }
} catch (error) {
    console.error('[seed] Could not inspect database, skipping seed:', error.message);
    process.exit(0);
} finally {
    await prisma.$disconnect();
}

await import('./seed.mjs');
await import('./seed-ai-sections.mjs');
