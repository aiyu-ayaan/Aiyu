/**
 * Admin analytics read + reset API.
 *
 *   GET    /api/admin/analytics?range=7d|30d|90d  -> dashboard payload
 *   DELETE /api/admin/analytics                   -> purge all analytics data
 *
 * Reads KPI totals and the daily time-series from the pre-aggregated
 * `AnalyticsDaily` rollup, and computes top-N breakdowns from the raw
 * `AnalyticsEvent` log (bounded by the selected range). Bots are excluded from
 * "human" metrics but reported separately.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { dayKey } from '@/lib/analytics';

const RANGES = { '7d': 7, '30d': 30, '90d': 90 };

function startForRange(days) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1));
    return d;
}

/** Build a continuous list of YYYY-MM-DD day keys from start..today (UTC). */
function dayRange(days) {
    const out = [];
    const d = startForRange(days);
    for (let i = 0; i < days; i++) {
        out.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return out;
}

export async function GET(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const rangeKey = RANGES[searchParams.get('range')] ? searchParams.get('range') : '30d';
        const days = RANGES[rangeKey];
        const start = startForRange(days);
        const startDay = dayKey(start);
        const sinceFilter = { createdAt: { gte: start }, isBot: false };

        // ── Time-series + KPI totals from the rollup (site-wide buckets) ──
        const dailyRows = await prisma.analyticsDaily.findMany({
            where: { day: { gte: startDay }, entityType: '' },
            select: { day: true, type: true, views: true, uniques: true },
        });

        const seriesMap = new Map(); // day -> { views, uniques }
        const totals = { pageview: { views: 0, uniques: 0 }, entity_view: { views: 0 }, contact_submit: { views: 0 }, outbound_click: { views: 0 } };
        for (const r of dailyRows) {
            if (totals[r.type]) {
                totals[r.type].views += r.views;
                if (r.type === 'pageview') totals.pageview.uniques += r.uniques;
            }
            if (r.type === 'pageview') {
                const cur = seriesMap.get(r.day) || { views: 0, uniques: 0 };
                cur.views += r.views;
                cur.uniques += r.uniques;
                seriesMap.set(r.day, cur);
            }
        }

        const series = dayRange(days).map((day) => ({
            day,
            views: seriesMap.get(day)?.views || 0,
            uniques: seriesMap.get(day)?.uniques || 0,
        }));

        // ── Top pages (raw, humans only) ──
        const topPagesRaw = await prisma.analyticsEvent.groupBy({
            by: ['path'],
            where: { ...sinceFilter, type: 'pageview' },
            _count: { _all: true },
            orderBy: { _count: { path: 'desc' } },
            take: 8,
        });
        const topPages = topPagesRaw.map((r) => ({ path: r.path, views: r._count._all }));

        // ── Top entities per type (raw, humans only) ──
        const entityRaw = await prisma.analyticsEvent.groupBy({
            by: ['entityType', 'entityId', 'entitySlug'],
            where: { ...sinceFilter, type: 'entity_view', NOT: { entityType: null } },
            _count: { _all: true },
        });
        const topEntities = {};
        for (const r of entityRaw) {
            if (!r.entityType) continue;
            (topEntities[r.entityType] ||= []).push({
                id: r.entityId,
                slug: r.entitySlug || r.entityId,
                views: r._count._all,
            });
        }
        for (const k of Object.keys(topEntities)) {
            topEntities[k].sort((a, b) => b.views - a.views);
            topEntities[k] = topEntities[k].slice(0, 6);
        }

        // ── Fetch metadata for top entities to power hover previews ──
        if (topEntities.blog?.length) {
            const ids = topEntities.blog.map((b) => b.id).filter(Boolean);
            const blogs = await prisma.blog.findMany({
                where: { id: { in: ids } },
                select: { id: true, title: true, image: true, excerpt: true },
            });
            const blogMap = new Map(blogs.map((b) => [b.id, b]));
            for (const item of topEntities.blog) {
                const details = blogMap.get(item.id);
                if (details) {
                    item.title = details.title;
                    item.image = details.image;
                    item.description = details.excerpt;
                }
            }
        }

        if (topEntities.project?.length) {
            const ids = topEntities.project.map((p) => p.id).filter(Boolean);
            const projects = await prisma.project.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true, image: true, description: true },
            });
            const projectMap = new Map(projects.map((p) => [p.id, p]));
            for (const item of topEntities.project) {
                const details = projectMap.get(item.id);
                if (details) {
                    item.title = details.name;
                    item.image = details.image;
                    item.description = details.description;
                }
            }
        }

        if (topEntities.app?.length) {
            const ids = topEntities.app.map((a) => a.id).filter(Boolean);
            const deployments = await prisma.deployment.findMany({
                where: { id: { in: ids } },
                select: { id: true, name: true, image: true, description: true },
            });
            const deploymentMap = new Map(deployments.map((d) => [d.id, d]));
            for (const item of topEntities.app) {
                const details = deploymentMap.get(item.id);
                if (details) {
                    item.title = details.name;
                    item.image = details.image;
                    item.description = details.description;
                }
            }
        }

        if (topEntities.gallery?.length) {
            const ids = topEntities.gallery.map((g) => g.id).filter(Boolean);
            const gallery = await prisma.gallery.findMany({
                where: { id: { in: ids } },
                select: { id: true, src: true, thumbnail: true, description: true },
            });
            const galleryMap = new Map(gallery.map((g) => [g.id, g]));
            for (const item of topEntities.gallery) {
                const details = galleryMap.get(item.id);
                if (details) {
                    item.title = details.description ? details.description.slice(0, 30) : 'Gallery Item';
                    item.image = details.thumbnail || details.src;
                    item.description = details.description;
                }
            }
        }

        // ── Referrer + device breakdowns (raw, humans only) ──
        const [referrerRaw, deviceRaw, botCount] = await Promise.all([
            prisma.analyticsEvent.groupBy({
                by: ['referrerType'],
                where: { ...sinceFilter, type: 'pageview' },
                _count: { _all: true },
            }),
            prisma.analyticsEvent.groupBy({
                by: ['device'],
                where: { ...sinceFilter, type: 'pageview' },
                _count: { _all: true },
            }),
            prisma.analyticsEvent.count({
                where: { createdAt: { gte: start }, isBot: true, type: 'pageview' },
            }),
        ]);

        const referrers = referrerRaw
            .map((r) => ({ type: r.referrerType, views: r._count._all }))
            .sort((a, b) => b.views - a.views);
        const devices = deviceRaw
            .map((r) => ({ type: r.device, views: r._count._all }))
            .sort((a, b) => b.views - a.views);

        return NextResponse.json({
            success: true,
            range: rangeKey,
            kpis: {
                views: totals.pageview.views,
                uniques: totals.pageview.uniques,
                entityViews: totals.entity_view.views,
                contacts: totals.contact_submit.views,
                outboundClicks: totals.outbound_click.views,
                botViews: botCount,
            },
            series,
            topPages,
            topEntities,
            referrers,
            devices,
        });
    } catch (error) {
        console.error('[analytics] read error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const [events, daily] = await Promise.all([
            prisma.analyticsEvent.deleteMany(),
            prisma.analyticsDaily.deleteMany(),
        ]);
        return NextResponse.json({ success: true, deleted: { events: events.count, daily: daily.count } });
    } catch (error) {
        console.error('[analytics] reset error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
