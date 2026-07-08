/**
 * One-time idempotent backfill of the AI Hub content tables
 * (AiSkillCategory/AiSkill, AiRecommendation, AiCredit, AiPrompt) from the
 * stored `aiPage` skeleton if it still carries content, else the bundled
 * defaults. Each table is skipped if it already has rows, so re-running is safe.
 *
 *   node --env-file=.env scripts/seed-ai-sections.mjs
 */
import { PrismaClient } from '@prisma/client';
import { DEFAULT_AI_PAGE } from '../src/lib/aiPageDefaults.js';

const prisma = new PrismaClient();

function sectionsByType(source) {
    const map = {};
    for (const s of source?.sections || []) if (s?.type) map[s.type] = s;
    return map;
}

async function main() {
    // Prefer the admin-saved skeleton's content if present, else defaults.
    const stored = await prisma.aiPage.findFirst();
    const storedData = stored?.data && Array.isArray(stored.data.sections) ? stored.data : null;
    const byType = sectionsByType(storedData || DEFAULT_AI_PAGE);
    const defByType = sectionsByType(DEFAULT_AI_PAGE);
    const seeded = { skills: 0, recommendations: 0, credits: 0, prompts: 0 };

    if ((await prisma.aiSkillCategory.count()) === 0) {
        const cats = byType.skills?.data?.categories || defByType.skills.data.categories;
        for (let ci = 0; ci < cats.length; ci++) {
            const cat = cats[ci];
            const created = await prisma.aiSkillCategory.create({
                data: { label: cat.label, accent: cat.accent || 'var(--accent-cyan)', displayOrder: ci },
            });
            const items = Array.isArray(cat.items) ? cat.items : [];
            for (let i = 0; i < items.length; i++) {
                await prisma.aiSkill.create({
                    data: {
                        categoryId: created.id,
                        name: items[i].name,
                        description: items[i].description || '',
                        url: items[i].url || null,
                        displayOrder: i,
                    },
                });
            }
            seeded.skills += items.length;
        }
    }

    if ((await prisma.aiRecommendation.count()) === 0) {
        const cards = byType.recommendations?.data?.cards || defByType.recommendations.data.cards;
        for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            await prisma.aiRecommendation.create({
                data: {
                    name: c.name,
                    url: c.url || '',
                    rating: Number.isFinite(c.rating) ? c.rating : 5,
                    accent: c.accent || 'var(--accent-cyan)',
                    blurb: c.blurb || '',
                    tags: Array.isArray(c.tags) ? c.tags : [],
                    displayOrder: i,
                },
            });
            seeded.recommendations++;
        }
    }

    if ((await prisma.aiCredit.count()) === 0) {
        const rows = byType.credits?.data?.rows || defByType.credits.data.rows;
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            await prisma.aiCredit.create({
                data: {
                    name: r.name,
                    offer: r.offer || '',
                    url: r.url || '',
                    noCard: r.noCard !== false,
                    freeApi: r.freeApi !== false,
                    note: r.note || '',
                    displayOrder: i,
                },
            });
            seeded.credits++;
        }
    }

    if ((await prisma.aiPrompt.count()) === 0) {
        const items = byType.prompts?.data?.items || defByType.prompts.data.items;
        for (let i = 0; i < items.length; i++) {
            const p = items[i];
            await prisma.aiPrompt.create({
                data: { title: p.title, role: p.role || '', prompt: p.prompt || '', displayOrder: i },
            });
            seeded.prompts++;
        }
    }

    console.log('Seeded:', seeded);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
