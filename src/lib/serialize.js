/**
 * Serializer shim + model registry — the single source of truth that preserves
 * the MongoDB response contract on top of Prisma/PostgreSQL.
 *
 * Two model kinds (see prisma/schema.prisma):
 *   - "relational": real columns. toClient simply renames `id` -> `_id`.
 *   - "json":       a single `data Json` column holding the nested document.
 *                   toClient spreads `data` back to the top level and adds `_id`.
 *
 * Secrets that were `select:false` in Mongoose (Config) live in dedicated
 * columns and are withheld by default — pass { withSecrets: true } to include.
 *
 * Used by API routes (toClient/getSingleton/upsertSingleton), the storage audit,
 * import/export, and the Mongo→Postgres migration (fromClient).
 */

// ───────────────────────────── Registry ─────────────────────────────

// Top-level DateTime columns per model (coerced to Date on write).
const DATE_FIELDS = {
  blog: ['createdAt', 'updatedAt'],
  project: ['createdAt', 'updatedAt'],
  deployment: ['createdAt', 'updatedAt'],
  gallery: ['createdAt'],
  contactMessage: ['createdAt'],
  aiLog: ['createdAt', 'updatedAt'],
  cron: ['lastRun', 'nextRun', 'createdAt', 'updatedAt'],
  cronLog: ['ranAt', 'createdAt', 'updatedAt'],
  theme: ['createdAt', 'updatedAt'],
  social: [],
  analyticsEvent: ['createdAt'],
  analyticsDaily: ['createdAt', 'updatedAt'],
  indexingLog: ['createdAt'],
  session: ['lastSeenAt', 'revokedAt', 'expiresAt', 'createdAt'],
  auditLog: ['createdAt'],
  uptimeTarget: ['createdAt'],
  uptimeCheck: ['checkedAt'],
};

// Integer columns per model (coerced to Number on write).
const INT_FIELDS = {
  project: ['displayOrder'],
  deployment: ['displayOrder'],
  gallery: ['width', 'height', 'order'],
  aiLog: ['inputTokens', 'outputTokens', 'totalTokens'],
  cron: ['retryCount', 'retryDelay'],
  cronLog: ['durationMs'],
  analyticsDaily: ['views', 'uniques'],
  uptimeCheck: ['statusCode', 'latencyMs'],
};

// Whitelisted columns for relational models (used by fromClient on import/migrate).
const RELATIONAL_COLUMNS = {
  blog: [
    'title', 'slug', 'content', 'image', 'imageAlt', 'excerpt', 'seoTitle',
    'seoDescription', 'canonicalUrl', 'keywords', 'socialTitle', 'socialDescription',
    'socialImage', 'socialImageAlt', 'noIndex', 'tags', 'date', 'published',
    'isAutomated', 'createdAt', 'updatedAt',
  ],
  project: [
    'name', 'slug', 'techStack', 'year', 'status', 'projectType', 'description',
    'codeLink', 'blogLink', 'image', 'displayOrder', 'createdAt', 'updatedAt',
  ],
  deployment: [
    'name', 'slug', 'techStack', 'status', 'appType', 'environment',
    'hostingProvider', 'description', 'hostedUrl', 'blogLink', 'image',
    'displayOrder', 'createdAt', 'updatedAt',
  ],
  gallery: ['src', 'thumbnail', 'description', 'width', 'height', 'isPinned', 'order', 'createdAt'],
  contactMessage: ['name', 'email', 'message', 'read', 'createdAt'],
  aiLog: [
    'provider', 'model', 'mode', 'prompt', 'response',
    'inputTokens', 'outputTokens', 'totalTokens', 'createdAt', 'updatedAt',
  ],
  cron: [
    'name', 'type', 'schedule', 'enabled', 'action', 'webhookUrl', 'webhookUrlType',
    'webhookMethod', 'webhookHeaders', 'webhookHeadersType', 'webhookBody',
    'webhookBodyType', 'webhookEnv', 'lastRun', 'lastRunStatus', 'lastRunLog',
    'nextRun', 'notificationEnabled', 'notificationOn', 'retryEnabled', 'retryType',
    'retryCount', 'retryDelay', 'createdAt', 'updatedAt',
  ],
  cronLog: [
    'cronId', 'cronName', 'action', 'status', 'method', 'url', 'log',
    'durationMs', 'ranAt', 'createdAt', 'updatedAt',
  ],
  theme: [
    'name', 'slug', 'description', 'isCustom', 'isPredefined', 'variants',
    'previewImage', 'author', 'createdAt', 'updatedAt',
  ],
  social: ['name', 'url', 'iconName', 'isHidden'],
  analyticsEvent: [
    'type', 'path', 'entityType', 'entityId', 'entitySlug', 'referrer',
    'referrerType', 'device', 'country', 'visitorHash', 'sessionId', 'isBot',
    'meta', 'createdAt',
  ],
  analyticsDaily: [
    'day', 'type', 'entityType', 'entityId', 'views', 'uniques',
    'createdAt', 'updatedAt',
  ],
  indexingLog: ['url', 'type', 'status', 'response', 'createdAt'],
  session: ['jti', 'label', 'ipAddress', 'userAgent', 'lastSeenAt', 'revokedAt', 'expiresAt', 'createdAt'],
  auditLog: ['action', 'category', 'details', 'ipAddress', 'userAgent', 'createdAt'],
  uptimeTarget: ['label', 'url', 'enabled', 'createdAt'],
  uptimeCheck: ['target', 'label', 'source', 'status', 'statusCode', 'latencyMs', 'error', 'checkedAt'],
};

// Columns dropped from relational rows when serializing to the client.
const RELATIONAL_OMIT = {
  blog: ['searchVector'],
};

// Secret columns (withheld by default) for the json-blob Config model.
const CONFIG_SECRETS = [
  'encryptedGithubToken',
  'encryptedGeminiApiKey',
  'encryptedGroqApiKey',
  'encryptedOpenRouterApiKey',
  'blogApiTokenHash',
];

// Secret column (withheld by default) for the SeoConfig json-blob model.
const SEO_SECRETS = ['encryptedGoogleServiceAccount'];

// Secret column (withheld by default) for the McpConfig json-blob model.
const MCP_SECRETS = ['mcpTokenHash'];

/**
 * @typedef {Object} ModelDef
 * @property {string} delegate  Prisma delegate name (prisma[delegate]).
 * @property {'relational'|'json'} kind
 * @property {boolean} singleton  True for one-row config documents.
 * @property {string[]} [secrets]    json: columns withheld unless withSecrets.
 * @property {boolean} [timestamps]  json: whether wrapper createdAt/updatedAt is exposed.
 */

/** @type {Record<string, ModelDef>} */
export const MODELS = {
  // Relational
  blog: { delegate: 'blog', kind: 'relational', singleton: false },
  project: { delegate: 'project', kind: 'relational', singleton: false },
  deployment: { delegate: 'deployment', kind: 'relational', singleton: false },
  gallery: { delegate: 'gallery', kind: 'relational', singleton: false },
  contactMessage: { delegate: 'contactMessage', kind: 'relational', singleton: false },
  aiLog: { delegate: 'aiLog', kind: 'relational', singleton: false },
  cron: { delegate: 'cron', kind: 'relational', singleton: false },
  cronLog: { delegate: 'cronLog', kind: 'relational', singleton: false },
  theme: { delegate: 'theme', kind: 'relational', singleton: false },
  social: { delegate: 'social', kind: 'relational', singleton: false },
  analyticsEvent: { delegate: 'analyticsEvent', kind: 'relational', singleton: false },
  analyticsDaily: { delegate: 'analyticsDaily', kind: 'relational', singleton: false },
  indexingLog: { delegate: 'indexingLog', kind: 'relational', singleton: false },
  session: { delegate: 'session', kind: 'relational', singleton: false },
  auditLog: { delegate: 'auditLog', kind: 'relational', singleton: false },
  uptimeTarget: { delegate: 'uptimeTarget', kind: 'relational', singleton: false },
  uptimeCheck: { delegate: 'uptimeCheck', kind: 'relational', singleton: false },
  // Json-blob singletons
  config: { delegate: 'config', kind: 'json', singleton: true, secrets: CONFIG_SECRETS, timestamps: false },
  seoConfig: { delegate: 'seoConfig', kind: 'json', singleton: true, secrets: SEO_SECRETS, timestamps: false },
  ads: { delegate: 'ads', kind: 'json', singleton: true, timestamps: true },
  about: { delegate: 'about', kind: 'json', singleton: true, timestamps: false },
  home: { delegate: 'home', kind: 'json', singleton: true, timestamps: false },
  header: { delegate: 'header', kind: 'json', singleton: true, timestamps: false },
  notificationConfig: { delegate: 'notificationConfig', kind: 'json', singleton: true, timestamps: true },
  github: { delegate: 'gitHub', kind: 'json', singleton: true, timestamps: false },
  cronEnv: { delegate: 'cronEnv', kind: 'json', singleton: true, timestamps: true },
  mcpConfig: { delegate: 'mcpConfig', kind: 'json', singleton: true, timestamps: true, secrets: MCP_SECRETS },
  aiPage: { delegate: 'aiPage', kind: 'json', singleton: true, timestamps: true },
};

export function getDelegate(prisma, key) {
  const def = MODELS[key];
  if (!def) throw new Error(`Unknown model key: ${key}`);
  const delegate = prisma[def.delegate];
  if (!delegate) throw new Error(`Prisma delegate missing for: ${key}`);
  return delegate;
}

// ───────────────────────────── toClient ─────────────────────────────

function toClientRelational(key, row) {
  if (!row) return null;
  const omit = RELATIONAL_OMIT[key] || [];
  const out = { _id: row.id };
  for (const [field, value] of Object.entries(row)) {
    if (field === 'id' || omit.includes(field)) continue;
    out[field] = value;
  }
  return out;
}

function toClientJson(key, row, { withSecrets = false } = {}) {
  if (!row) return null;
  const def = MODELS[key];
  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const out = { ...data, _id: row.id };

  if (def.timestamps) {
    out.createdAt = row.createdAt;
    out.updatedAt = row.updatedAt;
  }

  if (withSecrets && def.secrets) {
    for (const secret of def.secrets) {
      if (row[secret] !== undefined && row[secret] !== null) {
        out[secret] = row[secret];
      }
    }
  }

  return out;
}

/**
 * Serialize a Prisma row to the legacy Mongo client shape (`_id`, nested data).
 */
export function toClient(key, row, opts = {}) {
  if (row == null) return null;
  return MODELS[key].kind === 'json'
    ? toClientJson(key, row, opts)
    : toClientRelational(key, row);
}

export function toClientList(key, rows, opts = {}) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => toClient(key, row, opts));
}

/**
 * Selectable columns for a relational model, including the primary key.
 * Used to build a Prisma `select` that pulls only referenced columns (e.g. the
 * cron template engine projecting `$blogs.0.title` down to `{ id, title }` so
 * heavy text columns like `blog.content` never enter the heap). Returns null
 * for unknown or json-blob models, signalling "fetch all columns".
 */
export function getModelColumns(key) {
  const cols = RELATIONAL_COLUMNS[key];
  return cols ? ['id', ...cols] : null;
}

// ──────────────────────────── fromClient ────────────────────────────

function coerceDate(value) {
  if (value == null || value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function coerceInt(value) {
  if (value == null) return value;
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
}

function extractId(doc) {
  const raw = doc?._id ?? doc?.id;
  if (raw == null) return undefined;
  // Mongo extended-JSON ({ $oid }) or ObjectId-like objects.
  if (typeof raw === 'object') {
    if (raw.$oid) return String(raw.$oid);
    return String(raw);
  }
  return String(raw);
}

function fromClientRelational(key, doc) {
  const columns = RELATIONAL_COLUMNS[key] || [];
  const dates = DATE_FIELDS[key] || [];
  const ints = INT_FIELDS[key] || [];
  const data = {};

  for (const col of columns) {
    if (doc[col] === undefined) continue;
    let value = doc[col];
    if (dates.includes(col)) value = coerceDate(value);
    else if (ints.includes(col)) value = coerceInt(value);
    if (value !== undefined) data[col] = value;
  }

  const id = extractId(doc);
  if (id) data.id = id;
  return data;
}

function fromClientJson(key, doc) {
  const def = MODELS[key];
  const rest = { ...doc };
  delete rest._id;
  delete rest.id;
  delete rest.__v;

  const out = {};

  // Pull secrets into their own columns.
  if (def.secrets) {
    for (const secret of def.secrets) {
      if (rest[secret] !== undefined) {
        out[secret] = rest[secret] == null ? null : String(rest[secret]);
        delete rest[secret];
      }
    }
  }

  // For timestamped json models, move wrapper timestamps into columns.
  if (def.timestamps) {
    if (rest.createdAt !== undefined) {
      const created = coerceDate(rest.createdAt);
      if (created) out.createdAt = created;
      delete rest.createdAt;
    }
    if (rest.updatedAt !== undefined) {
      const updated = coerceDate(rest.updatedAt);
      if (updated) out.updatedAt = updated;
      delete rest.updatedAt;
    }
  }

  out.data = rest;

  const id = extractId(doc);
  if (id) out.id = id;
  return out;
}

/**
 * Convert a legacy/client document into a Prisma `data` payload (for create,
 * import, and migration). Maps `_id` -> `id`, splits json/secret columns, and
 * coerces dates/ints. Pass `{ keepId: false }` to omit the id (e.g. new rows).
 */
export function fromClient(key, doc, { keepId = true } = {}) {
  if (!doc) return {};
  const data = MODELS[key].kind === 'json'
    ? fromClientJson(key, doc)
    : fromClientRelational(key, doc);
  if (!keepId) delete data.id;
  return data;
}

// ──────────────────────── Singleton helpers ────────────────────────

/**
 * Read the single row of a config/document model, serialized to client shape.
 */
export async function getSingleton(prisma, key, opts = {}) {
  const row = await getDelegate(prisma, key).findFirst();
  return toClient(key, row, opts);
}

/**
 * Upsert the single row of a config/document model from a client-shaped patch.
 * Merges json `data` with the existing row so partial updates behave like
 * Mongoose `findOneAndUpdate({}, patch)`. Returns the serialized result.
 */
export async function upsertSingleton(prisma, key, patch, opts = {}) {
  const delegate = getDelegate(prisma, key);
  const existing = await delegate.findFirst();
  const def = MODELS[key];

  if (def.kind === 'json') {
    // Merge nested data so partial patches keep untouched fields.
    const current = existing ? toClient(key, existing, { withSecrets: true }) : {};
    const merged = { ...current, ...patch };
    const payload = fromClient(key, merged, { keepId: false });
    const row = existing
      ? await delegate.update({ where: { id: existing.id }, data: payload })
      : await delegate.create({ data: payload });
    return toClient(key, row, opts);
  }

  const payload = fromClient(key, patch, { keepId: false });
  const row = existing
    ? await delegate.update({ where: { id: existing.id }, data: payload })
    : await delegate.create({ data: payload });
  return toClient(key, row, opts);
}

export const MODEL_KEYS = Object.keys(MODELS);
