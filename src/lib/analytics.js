/**
 * Self-hosted, first-party analytics engine.
 *
 * `recordEvent` normalizes an incoming tracking payload, derives privacy-safe
 * dimensions (device, referrer classification, a daily-rotating salted visitor
 * hash), writes one append-only `AnalyticsEvent`, and upserts the matching
 * `AnalyticsDaily` rollup so the admin dashboard reads aggregates instead of
 * scanning the raw log.
 *
 * No raw IPs or full user-agents are ever stored — the visitor hash rotates
 * every UTC day, so it cannot be used as a durable identifier. All writes are
 * best-effort and never throw into the request path.
 */
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getClientIdentifier } from '@/lib/trafficControl';

export const EVENT_TYPES = ['pageview', 'entity_view', 'contact_submit', 'outbound_click'];
export const ENTITY_TYPES = ['blog', 'project', 'app', 'gallery'];

const BOT_RE = /bot|crawl|spider|slurp|bing|duckduck|baidu|yandex|sogou|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|preview|fetch|monitor|lighthouse|headless|python-requests|curl|wget|axios|node-fetch|postman/i;
const TABLET_RE = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i;
const MOBILE_RE = /mobi|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|opera mini/i;

const SEARCH_HOSTS = /(^|\.)(google|bing|yahoo|duckduckgo|baidu|yandex|ecosia|brave|startpage|qwant)\./i;
const SOCIAL_HOSTS = /(^|\.)(facebook|fb|instagram|t\.co|twitter|x\.com|linkedin|reddit|youtube|pinterest|tiktok|threads|mastodon|bsky|bluesky|whatsapp|telegram|t\.me|news\.ycombinator|medium|dev\.to)\b/i;

/** Classify a user-agent string into a coarse device bucket. */
export function classifyDevice(userAgent = '') {
  const ua = String(userAgent || '');
  if (!ua) return 'desktop';
  if (BOT_RE.test(ua)) return 'bot';
  if (TABLET_RE.test(ua)) return 'tablet';
  if (MOBILE_RE.test(ua)) return 'mobile';
  return 'desktop';
}

export function isBotUA(userAgent = '') {
  return BOT_RE.test(String(userAgent || ''));
}

/** Reduce a referrer URL to a bare host (no scheme/path/query) — strips PII. */
export function normalizeReferrer(referrer = '', selfHost = '') {
  if (!referrer) return '';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '').toLowerCase();
    return host;
  } catch {
    return '';
  }
}

/** Bucket a referrer host relative to our own host. */
export function classifyReferrer(referrerHost = '', selfHost = '') {
  if (!referrerHost) return 'direct';
  const self = String(selfHost || '').replace(/^www\./i, '').toLowerCase();
  if (self && referrerHost === self) return 'internal';
  if (SEARCH_HOSTS.test(referrerHost)) return 'search';
  if (SOCIAL_HOSTS.test(referrerHost)) return 'social';
  return 'external';
}

/** UTC day bucket (YYYY-MM-DD) for a given date. */
export function dayKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
}

const VISITOR_SALT = process.env.ANALYTICS_SALT || process.env.AUTH_SECRET || 'aiyu-analytics';

/**
 * Daily-rotating, salted, irreversible visitor fingerprint. Combines IP + UA +
 * day so two requests from the same visitor on the same day collapse to one
 * hash, but the value is useless across days or as a cross-site identifier.
 */
export function visitorHash(ip = '', userAgent = '', day = dayKey()) {
  return createHash('sha256')
    .update(`${VISITOR_SALT}|${ip}|${userAgent}|${day}`)
    .digest('hex')
    .slice(0, 32);
}

function cleanString(value, max = 512) {
  if (value == null) return '';
  return String(value).slice(0, max);
}

/**
 * Normalize a raw client payload + request into a persisted event shape.
 * Pure-ish: derives everything from the inputs, no DB access.
 */
export function buildEvent(payload = {}, request) {
  const headers = request?.headers;
  const userAgent = headers?.get?.('user-agent') || '';
  const ip = getClientIdentifier(request);
  const country = headers?.get?.('cf-ipcountry')
    || headers?.get?.('x-vercel-ip-country')
    || headers?.get?.('x-geo-country')
    || null;

  let selfHost = '';
  try { selfHost = new URL(request?.url).hostname; } catch { /* noop */ }

  const type = EVENT_TYPES.includes(payload.type) ? payload.type : 'pageview';
  const entityType = ENTITY_TYPES.includes(payload.entityType) ? payload.entityType : null;
  const referrerHost = normalizeReferrer(payload.referrer, selfHost);
  const day = dayKey();

  return {
    type,
    path: cleanString(payload.path || '/', 1024),
    entityType,
    entityId: entityType ? cleanString(payload.entityId, 128) || null : null,
    entitySlug: entityType ? cleanString(payload.entitySlug, 256) || null : null,
    referrer: referrerHost,
    referrerType: classifyReferrer(referrerHost, selfHost),
    device: classifyDevice(userAgent),
    country: country ? cleanString(country, 8) : null,
    visitorHash: visitorHash(ip, userAgent, day),
    sessionId: cleanString(payload.sessionId, 64),
    isBot: isBotUA(userAgent),
    meta: payload.meta && typeof payload.meta === 'object' ? payload.meta : {},
    _day: day,
  };
}

/**
 * Upsert the daily rollup for an event. `uniques` is incremented only the first
 * time a given visitorHash is seen for that (day,type,entity) bucket — tracked
 * via a lightweight companion event probe so we avoid a second table.
 */
async function bumpDaily(event, isUnique) {
  const where_day = event._day;
  const keys = [
    { type: event.type, entityType: '', entityId: '' }, // site-wide bucket for the type
  ];
  if (event.entityType && event.entityId) {
    keys.push({ type: event.type, entityType: event.entityType, entityId: event.entityId });
  }

  for (const k of keys) {
    await prisma.analyticsDaily.upsert({
      where: {
        day_type_entityType_entityId: {
          day: where_day,
          type: k.type,
          entityType: k.entityType,
          entityId: k.entityId,
        },
      },
      create: {
        day: where_day,
        type: k.type,
        entityType: k.entityType,
        entityId: k.entityId,
        views: 1,
        uniques: isUnique ? 1 : 0,
      },
      update: {
        views: { increment: 1 },
        ...(isUnique ? { uniques: { increment: 1 } } : {}),
      },
    });
  }
}

/**
 * Record one analytics event. Best-effort: returns { ok } and never throws.
 */
export async function recordEvent(payload, request) {
  try {
    const event = buildEvent(payload, request);
    const { _day, ...row } = event;

    // A visitor is "unique" for this day+type if no prior event shares the hash.
    const prior = await prisma.analyticsEvent.count({
      where: {
        visitorHash: row.visitorHash,
        type: row.type,
        createdAt: { gte: new Date(`${_day}T00:00:00.000Z`) },
      },
    });
    const isUnique = prior === 0;

    await prisma.analyticsEvent.create({ data: row });
    await bumpDaily(event, isUnique);

    return { ok: true };
  } catch (error) {
    console.error('[analytics] recordEvent failed:', error?.message);
    return { ok: false, error: error?.message };
  }
}
