-- The schema of the former Postgres database (36 tables).
-- Times are UTC text, `YYYY-MM-DDTHH:MM:SS.sss`; booleans 0/1; JSON and string lists are JSON text.

CREATE TABLE "About" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Ads" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "AiCredit" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "offer" TEXT NOT NULL DEFAULT '',
  "url" TEXT NOT NULL DEFAULT '',
  "noCard" INTEGER NOT NULL DEFAULT 1 CHECK ("noCard" IN (0, 1)),
  "freeApi" INTEGER NOT NULL DEFAULT 1 CHECK ("freeApi" IN (0, 1)),
  "note" TEXT NOT NULL DEFAULT '',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AiCredit_displayOrder_idx" ON "AiCredit" ("displayOrder");

CREATE TABLE "AiLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "prompt" TEXT,
  "response" TEXT,
  "inputTokens" INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "totalTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AiLog_createdAt_idx" ON "AiLog" ("createdAt");
CREATE INDEX "AiLog_provider_createdAt_idx" ON "AiLog" (provider, "createdAt");

CREATE TABLE "AiPage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "AiPrompt" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "prompt" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AiPrompt_displayOrder_idx" ON "AiPrompt" ("displayOrder");

CREATE TABLE "AiRecommendation" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL DEFAULT '',
  "rating" INTEGER NOT NULL DEFAULT 5,
  "accent" TEXT NOT NULL DEFAULT 'var(--accent-cyan)',
  "blurb" TEXT NOT NULL DEFAULT '',
  "tags" TEXT DEFAULT '[]' CHECK (json_valid("tags")),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AiRecommendation_displayOrder_idx" ON "AiRecommendation" ("displayOrder");

CREATE TABLE "AiSkillCategory" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "label" TEXT NOT NULL,
  "accent" TEXT NOT NULL DEFAULT 'var(--accent-cyan)',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AiSkillCategory_displayOrder_idx" ON "AiSkillCategory" ("displayOrder");

CREATE TABLE "AnalyticsDaily" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "day" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT '',
  "entityId" TEXT NOT NULL DEFAULT '',
  "views" INTEGER NOT NULL DEFAULT 0,
  "uniques" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AnalyticsDaily_day_idx" ON "AnalyticsDaily" (day);
CREATE UNIQUE INDEX "AnalyticsDaily_day_type_entityType_entityId_key" ON "AnalyticsDaily" (day, type, "entityType", "entityId");
CREATE INDEX "AnalyticsDaily_type_day_idx" ON "AnalyticsDaily" (type, day);

CREATE TABLE "AnalyticsEvent" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "type" TEXT NOT NULL,
  "path" TEXT NOT NULL DEFAULT '',
  "entityType" TEXT,
  "entityId" TEXT,
  "entitySlug" TEXT,
  "referrer" TEXT NOT NULL DEFAULT '',
  "referrerType" TEXT NOT NULL DEFAULT 'direct',
  "device" TEXT NOT NULL DEFAULT 'desktop',
  "country" TEXT,
  "visitorHash" TEXT NOT NULL DEFAULT '',
  "sessionId" TEXT NOT NULL DEFAULT '',
  "isBot" INTEGER NOT NULL DEFAULT 0 CHECK ("isBot" IN (0, 1)),
  "meta" TEXT DEFAULT '{}' CHECK (json_valid("meta")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent" ("createdAt");
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent" ("entityType", "entityId");
CREATE INDEX "AnalyticsEvent_referrerType_createdAt_idx" ON "AnalyticsEvent" ("referrerType", "createdAt");
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent" (type, "createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "action" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'system',
  "details" TEXT NOT NULL DEFAULT '',
  "ipAddress" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog" (action, "createdAt");
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog" (category, "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog" ("createdAt");

CREATE TABLE "Blog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "image" TEXT,
  "imageAlt" TEXT NOT NULL DEFAULT '',
  "excerpt" TEXT NOT NULL DEFAULT '',
  "seoTitle" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "canonicalUrl" TEXT NOT NULL DEFAULT '',
  "keywords" TEXT DEFAULT '[]' CHECK (json_valid("keywords")),
  "socialTitle" TEXT NOT NULL DEFAULT '',
  "socialDescription" TEXT NOT NULL DEFAULT '',
  "socialImage" TEXT NOT NULL DEFAULT '',
  "socialImageAlt" TEXT NOT NULL DEFAULT '',
  "noIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("noIndex" IN (0, 1)),
  "tags" TEXT DEFAULT '[]' CHECK (json_valid("tags")),
  "date" TEXT NOT NULL,
  "published" INTEGER NOT NULL DEFAULT 0 CHECK ("published" IN (0, 1)),
  "isAutomated" INTEGER NOT NULL DEFAULT 0 CHECK ("isAutomated" IN (0, 1)),
  "isFlagged" INTEGER NOT NULL DEFAULT 0 CHECK ("isFlagged" IN (0, 1)),
  "flagReason" TEXT NOT NULL DEFAULT '',
  "reviewStatus" TEXT NOT NULL DEFAULT 'CLEAN',
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "Blog_createdAt_idx" ON "Blog" ("createdAt");
CREATE INDEX "Blog_isFlagged_createdAt_idx" ON "Blog" ("isFlagged", "createdAt");
CREATE INDEX "Blog_published_createdAt_idx" ON "Blog" (published, "createdAt");
CREATE INDEX "Blog_slug_idx" ON "Blog" (slug);
CREATE INDEX "Blog_updatedAt_idx" ON "Blog" ("updatedAt");

CREATE TABLE "Config" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "encryptedGithubToken" TEXT,
  "encryptedGeminiApiKey" TEXT,
  "encryptedGroqApiKey" TEXT,
  "encryptedOpenRouterApiKey" TEXT,
  "blogApiTokenHash" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "encryptedGithubWebhookSecret" TEXT
) STRICT;

CREATE TABLE "ContactMessage" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "read" INTEGER NOT NULL DEFAULT 0 CHECK ("read" IN (0, 1)),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage" ("createdAt");
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage" (email);
CREATE INDEX "ContactMessage_read_createdAt_idx" ON "ContactMessage" (read, "createdAt");

CREATE TABLE "Cron" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'user',
  "schedule" TEXT NOT NULL DEFAULT '0 0 * * *',
  "enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("enabled" IN (0, 1)),
  "action" TEXT NOT NULL,
  "webhookUrl" TEXT,
  "webhookUrlType" TEXT NOT NULL DEFAULT 'fixed',
  "webhookMethod" TEXT NOT NULL DEFAULT 'POST',
  "webhookHeaders" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("webhookHeaders")),
  "webhookHeadersType" TEXT NOT NULL DEFAULT 'fixed',
  "webhookBody" TEXT,
  "webhookBodyType" TEXT NOT NULL DEFAULT 'fixed',
  "webhookEnv" TEXT NOT NULL DEFAULT '[]' CHECK (json_valid("webhookEnv")),
  "lastRun" TEXT,
  "lastRunStatus" TEXT,
  "lastRunLog" TEXT,
  "nextRun" TEXT,
  "notificationEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("notificationEnabled" IN (0, 1)),
  "notificationOn" TEXT NOT NULL DEFAULT 'always',
  "retryEnabled" INTEGER NOT NULL DEFAULT 0 CHECK ("retryEnabled" IN (0, 1)),
  "retryType" TEXT NOT NULL DEFAULT 'stable',
  "retryCount" INTEGER NOT NULL DEFAULT 3,
  "retryDelay" INTEGER NOT NULL DEFAULT 60,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "CronEnv" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Deployment" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT '',
  "techStack" TEXT DEFAULT '[]' CHECK (json_valid("techStack")),
  "status" TEXT NOT NULL DEFAULT 'Live',
  "appType" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'Production',
  "hostingProvider" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "hostedUrl" TEXT,
  "blogLink" TEXT,
  "image" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "projectId" TEXT
) STRICT;
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment" ("createdAt");
CREATE INDEX "Deployment_displayOrder_updatedAt_idx" ON "Deployment" ("displayOrder", "updatedAt");
CREATE INDEX "Deployment_projectId_idx" ON "Deployment" ("projectId");
CREATE INDEX "Deployment_slug_idx" ON "Deployment" (slug);

CREATE TABLE "Gallery" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "src" TEXT NOT NULL,
  "thumbnail" TEXT,
  "description" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "isPinned" INTEGER NOT NULL DEFAULT 0 CHECK ("isPinned" IN (0, 1)),
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "Gallery_createdAt_idx" ON "Gallery" ("createdAt");
CREATE INDEX "Gallery_isPinned_order_createdAt_idx" ON "Gallery" ("isPinned", "order", "createdAt");

CREATE TABLE "GitHub" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Header" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Home" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "IndexingLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "url" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "response" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "IndexingLog_createdAt_idx" ON "IndexingLog" ("createdAt");

CREATE TABLE "LegalApp" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "packageName" TEXT NOT NULL DEFAULT '',
  "description" TEXT NOT NULL DEFAULT '',
  "contactEmail" TEXT NOT NULL DEFAULT '',
  "deploymentId" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "LegalApp_deploymentId_idx" ON "LegalApp" ("deploymentId");
CREATE UNIQUE INDEX "LegalApp_slug_key" ON "LegalApp" (slug);

CREATE TABLE "McpConfig" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "mcpTokenHash" TEXT,
  "mcpTokenLast4" TEXT NOT NULL DEFAULT '',
  "mcpTokenUpdatedAt" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "NotificationConfig" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Project" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL DEFAULT '',
  "techStack" TEXT DEFAULT '[]' CHECK (json_valid("techStack")),
  "year" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "projectType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "codeLink" TEXT,
  "blogLink" TEXT,
  "image" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "repoFullName" TEXT,
  "repoData" TEXT CHECK (json_valid("repoData")),
  "readme" TEXT,
  "readmeFetchedAt" TEXT,
  "syncedAt" TEXT,
  "pinnedFields" TEXT DEFAULT '[]' CHECK (json_valid("pinnedFields")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "Project_createdAt_idx" ON "Project" ("createdAt");
CREATE INDEX "Project_displayOrder_year_idx" ON "Project" ("displayOrder", year);
CREATE UNIQUE INDEX "Project_repoFullName_key" ON "Project" ("repoFullName");
CREATE INDEX "Project_slug_idx" ON "Project" (slug);
CREATE INDEX "Project_source_idx" ON "Project" (source);
CREATE INDEX "Project_updatedAt_idx" ON "Project" ("updatedAt");

CREATE TABLE "ResumeStudio" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "SeoConfig" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "data" TEXT NOT NULL DEFAULT '{}' CHECK (json_valid("data")),
  "encryptedGoogleServiceAccount" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;

CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "jti" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "ipAddress" TEXT NOT NULL DEFAULT '',
  "userAgent" TEXT NOT NULL DEFAULT '',
  "lastSeenAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "revokedAt" TEXT,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "Session_createdAt_idx" ON "Session" ("createdAt");
CREATE UNIQUE INDEX "Session_jti_key" ON "Session" (jti);
CREATE INDEX "Session_revokedAt_expiresAt_idx" ON "Session" ("revokedAt", "expiresAt");

CREATE TABLE "Social" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "iconName" TEXT NOT NULL,
  "isHidden" INTEGER NOT NULL DEFAULT 0 CHECK ("isHidden" IN (0, 1))
) STRICT;
CREATE INDEX "Social_isHidden_idx" ON "Social" ("isHidden");

CREATE TABLE "Theme" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isCustom" INTEGER NOT NULL DEFAULT 1 CHECK ("isCustom" IN (0, 1)),
  "isPredefined" INTEGER NOT NULL DEFAULT 0 CHECK ("isPredefined" IN (0, 1)),
  "variants" TEXT NOT NULL CHECK (json_valid("variants")),
  "previewImage" TEXT NOT NULL DEFAULT '',
  "author" TEXT NOT NULL DEFAULT 'Admin',
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "Theme_createdAt_idx" ON "Theme" ("createdAt");
CREATE INDEX "Theme_isCustom_createdAt_idx" ON "Theme" ("isCustom", "createdAt");
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme" (slug);

CREATE TABLE "UptimeCheck" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "target" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'deployment',
  "status" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL DEFAULT 0,
  "latencyMs" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT NOT NULL DEFAULT '',
  "checkedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "UptimeCheck_checkedAt_idx" ON "UptimeCheck" ("checkedAt");
CREATE INDEX "UptimeCheck_target_checkedAt_idx" ON "UptimeCheck" (target, "checkedAt");

CREATE TABLE "UptimeTarget" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("enabled" IN (0, 1)),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now'))
) STRICT;
CREATE INDEX "UptimeTarget_enabled_createdAt_idx" ON "UptimeTarget" (enabled, "createdAt");

CREATE TABLE "AiSkill" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "url" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  FOREIGN KEY ("categoryId") REFERENCES "AiSkillCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE
) STRICT;
CREATE INDEX "AiSkill_categoryId_displayOrder_idx" ON "AiSkill" ("categoryId", "displayOrder");

CREATE TABLE "CronLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "cronId" TEXT NOT NULL,
  "cronName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "method" TEXT,
  "url" TEXT,
  "log" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "ranAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  FOREIGN KEY ("cronId") REFERENCES "Cron"(id) ON UPDATE CASCADE ON DELETE CASCADE
) STRICT;
CREATE INDEX "CronLog_cronId_ranAt_idx" ON "CronLog" ("cronId", "ranAt");
CREATE INDEX "CronLog_ranAt_idx" ON "CronLog" ("ranAt");
CREATE INDEX "CronLog_status_idx" ON "CronLog" (status);

CREATE TABLE "LegalDocument" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "appId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'custom',
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'markdown',
  "content" TEXT NOT NULL DEFAULT '',
  "seoDescription" TEXT NOT NULL DEFAULT '',
  "effectiveDate" TEXT NOT NULL DEFAULT '',
  "published" INTEGER NOT NULL DEFAULT 1 CHECK ("published" IN (0, 1)),
  "noIndex" INTEGER NOT NULL DEFAULT 0 CHECK ("noIndex" IN (0, 1)),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  FOREIGN KEY ("appId") REFERENCES "LegalApp"(id) ON UPDATE CASCADE ON DELETE CASCADE
) STRICT;
CREATE INDEX "LegalDocument_appId_displayOrder_idx" ON "LegalDocument" ("appId", "displayOrder");
CREATE UNIQUE INDEX "LegalDocument_appId_slug_key" ON "LegalDocument" ("appId", slug);

-- Full-text search over the blog (the Postgres `searchVector` column): title, tags, then content.
CREATE VIRTUAL TABLE "BlogSearch" USING fts5(id UNINDEXED, title, tags, content, tokenize = 'porter unicode61');
CREATE TRIGGER "BlogSearch_insert" AFTER INSERT ON "Blog" BEGIN
  INSERT INTO "BlogSearch" (id, title, tags, content)
  VALUES (new.id, new.title, (SELECT group_concat(value, ' ') FROM json_each(new.tags)), new.content);
END;
CREATE TRIGGER "BlogSearch_update" AFTER UPDATE OF id, title, tags, content ON "Blog" BEGIN
  DELETE FROM "BlogSearch" WHERE id = old.id;
  INSERT INTO "BlogSearch" (id, title, tags, content)
  VALUES (new.id, new.title, (SELECT group_concat(value, ' ') FROM json_each(new.tags)), new.content);
END;
CREATE TRIGGER "BlogSearch_delete" AFTER DELETE ON "Blog" BEGIN
  DELETE FROM "BlogSearch" WHERE id = old.id;
END;
