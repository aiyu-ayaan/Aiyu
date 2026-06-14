// One-time, idempotent MongoDB -> PostgreSQL data migration.
//
// Usage (run BEFORE removing the old data; needs the `mongodb` driver):
//   npm i mongodb            # if not already installed
//   node --env-file=.env scripts/migrate-mongodb-to-postgres.mjs
//   (npm run migrate:mongo passes --env-file=.env)
//
// Requires MONGODB_URI (source) and DATABASE_URL (target) in the environment.
// Re-runnable: every record is upserted by id, so running twice is safe.
//
// The model registry below mirrors lib/serialize.js. It is duplicated here on
// purpose so the script keeps working after `mongoose` (and the ESM serializer,
// which a .mjs file cannot import) are removed from the app.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Registry (mongo collection -> prisma model), aligned with lib/serialize.js ──

const RELATIONAL_COLUMNS = {
    blog: ['title', 'slug', 'content', 'image', 'imageAlt', 'excerpt', 'seoTitle', 'seoDescription', 'canonicalUrl', 'keywords', 'socialTitle', 'socialDescription', 'socialImage', 'socialImageAlt', 'noIndex', 'tags', 'date', 'published', 'isAutomated', 'createdAt', 'updatedAt'],
    project: ['name', 'slug', 'techStack', 'year', 'status', 'projectType', 'description', 'codeLink', 'blogLink', 'image', 'displayOrder', 'createdAt', 'updatedAt'],
    deployment: ['name', 'slug', 'techStack', 'status', 'appType', 'environment', 'hostingProvider', 'description', 'hostedUrl', 'blogLink', 'image', 'displayOrder', 'createdAt', 'updatedAt'],
    gallery: ['src', 'thumbnail', 'description', 'width', 'height', 'isPinned', 'order', 'createdAt'],
    contactMessage: ['name', 'email', 'message', 'read', 'createdAt'],
    aiLog: ['provider', 'model', 'mode', 'prompt', 'response', 'inputTokens', 'outputTokens', 'totalTokens', 'createdAt', 'updatedAt'],
    cron: ['name', 'type', 'schedule', 'enabled', 'action', 'webhookUrl', 'webhookUrlType', 'webhookMethod', 'webhookHeaders', 'webhookHeadersType', 'webhookBody', 'webhookBodyType', 'webhookEnv', 'lastRun', 'lastRunStatus', 'lastRunLog', 'nextRun', 'notificationEnabled', 'notificationOn', 'retryEnabled', 'retryType', 'retryCount', 'retryDelay', 'createdAt', 'updatedAt'],
    cronLog: ['cronId', 'cronName', 'action', 'status', 'method', 'url', 'log', 'durationMs', 'ranAt', 'createdAt', 'updatedAt'],
    theme: ['name', 'slug', 'description', 'isCustom', 'isPredefined', 'variants', 'previewImage', 'author', 'createdAt', 'updatedAt'],
    social: ['name', 'url', 'iconName', 'isHidden'],
};

const DATE_FIELDS = {
    blog: ['createdAt', 'updatedAt'], project: ['createdAt', 'updatedAt'], deployment: ['createdAt', 'updatedAt'],
    gallery: ['createdAt'], contactMessage: ['createdAt'], aiLog: ['createdAt', 'updatedAt'],
    cron: ['lastRun', 'nextRun', 'createdAt', 'updatedAt'], cronLog: ['ranAt', 'createdAt', 'updatedAt'],
    theme: ['createdAt', 'updatedAt'], social: [],
};

const INT_FIELDS = {
    project: ['displayOrder'], deployment: ['displayOrder'], gallery: ['width', 'height', 'order'],
    aiLog: ['inputTokens', 'outputTokens', 'totalTokens'], cron: ['retryCount', 'retryDelay'], cronLog: ['durationMs'],
};

const CONFIG_SECRETS = ['encryptedGithubToken', 'encryptedGeminiApiKey', 'encryptedGroqApiKey', 'encryptedOpenRouterApiKey', 'blogApiTokenHash'];

// Ordered so Cron is migrated before CronLog (FK dependency).
const MODELS = [
    { collection: 'blogs', delegate: 'blog', kind: 'relational' },
    { collection: 'projects', delegate: 'project', kind: 'relational' },
    { collection: 'deployments', delegate: 'deployment', kind: 'relational' },
    { collection: 'galleries', delegate: 'gallery', kind: 'relational' },
    { collection: 'contactmessages', delegate: 'contactMessage', kind: 'relational' },
    { collection: 'ailogs', delegate: 'aiLog', kind: 'relational' },
    { collection: 'themes', delegate: 'theme', kind: 'relational' },
    { collection: 'socials', delegate: 'social', kind: 'relational' },
    { collection: 'crons', delegate: 'cron', kind: 'relational' },
    { collection: 'cronlogs', delegate: 'cronLog', kind: 'relational' },
    { collection: 'configs', delegate: 'config', kind: 'json', secrets: CONFIG_SECRETS, timestamps: false },
    { collection: 'ads', delegate: 'ads', kind: 'json', timestamps: true },
    { collection: 'abouts', delegate: 'about', kind: 'json', timestamps: false },
    { collection: 'homes', delegate: 'home', kind: 'json', timestamps: false },
    { collection: 'headers', delegate: 'header', kind: 'json', timestamps: false },
    { collection: 'notificationconfigs', delegate: 'notificationConfig', kind: 'json', timestamps: true },
    { collection: 'githubs', delegate: 'github', kind: 'json', timestamps: false },
    { collection: 'cronenvs', delegate: 'cronEnv', kind: 'json', timestamps: true },
];

function coerceDate(value) {
    if (value == null || value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function idOf(doc) {
    const raw = doc?._id;
    if (raw == null) return undefined;
    if (typeof raw === 'object' && raw.$oid) return String(raw.$oid);
    return String(raw);
}

function fromMongoRelational(def, doc) {
    const dates = DATE_FIELDS[def.delegate] || [];
    const ints = INT_FIELDS[def.delegate] || [];
    const data = {};
    for (const col of RELATIONAL_COLUMNS[def.delegate]) {
        if (doc[col] === undefined) continue;
        let v = doc[col];
        if (dates.includes(col)) v = coerceDate(v);
        else if (ints.includes(col)) { const n = Number.parseInt(v, 10); v = Number.isNaN(n) ? undefined : n; }
        if (v !== undefined) data[col] = v;
    }
    const id = idOf(doc);
    if (id) data.id = id;
    return data;
}

function fromMongoJson(def, doc) {
    const rest = { ...doc };
    delete rest._id;
    delete rest.__v;
    const out = {};
    if (def.secrets) {
        for (const s of def.secrets) {
            if (rest[s] !== undefined) { out[s] = rest[s] == null ? null : String(rest[s]); delete rest[s]; }
        }
    }
    if (def.timestamps) {
        if (rest.createdAt !== undefined) { const c = coerceDate(rest.createdAt); if (c) out.createdAt = c; delete rest.createdAt; }
        if (rest.updatedAt !== undefined) { const u = coerceDate(rest.updatedAt); if (u) out.updatedAt = u; delete rest.updatedAt; }
    }
    out.data = rest;
    const id = idOf(doc);
    if (id) out.id = id;
    return out;
}

function toPrisma(def, doc) {
    return def.kind === 'json' ? fromMongoJson(def, doc) : fromMongoRelational(def, doc);
}

async function main() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI is not set. Aborting.');
        process.exit(1);
    }

    let MongoClient;
    try {
        ({ MongoClient } = await import('mongodb'));
    } catch {
        console.error('The "mongodb" driver is not installed. Run: npm i mongodb');
        process.exit(1);
    }

    const client = new MongoClient(mongoUri);
    const report = [];

    try {
        await client.connect();
        const db = client.db();
        console.log(`Connected to MongoDB: ${db.databaseName}`);

        for (const def of MODELS) {
            const docs = await db.collection(def.collection).find({}).toArray();
            let imported = 0;
            const failures = [];

            for (const doc of docs) {
                try {
                    const data = toPrisma(def, doc);
                    const { id, ...rest } = data;
                    if (!id) throw new Error('document has no _id');
                    await prisma[def.delegate].upsert({
                        where: { id },
                        create: { id, ...rest },
                        update: rest,
                    });
                    imported += 1;
                } catch (err) {
                    failures.push({ id: idOf(doc), error: err.message });
                }
            }

            report.push({ collection: def.collection, model: def.delegate, found: docs.length, imported, failed: failures.length });
            console.log(`  ${def.collection} -> ${def.delegate}: ${imported}/${docs.length} imported${failures.length ? `, ${failures.length} failed` : ''}`);
            if (failures.length) {
                for (const f of failures.slice(0, 5)) console.log(`     ! ${f.id}: ${f.error}`);
            }
        }

        console.log('\nMigration report:');
        console.table(report);
        const totalFailed = report.reduce((sum, r) => sum + r.failed, 0);
        console.log(totalFailed === 0 ? '\n✅ Migration completed with no failures.' : `\n⚠️  Migration completed with ${totalFailed} failed record(s).`);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exitCode = 1;
    } finally {
        await client.close().catch(() => {});
        await prisma.$disconnect();
    }
}

main();
