-- CreateTable
CREATE TABLE "Blog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "image" TEXT,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "canonicalUrl" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialTitle" TEXT NOT NULL DEFAULT '',
    "socialDescription" TEXT NOT NULL DEFAULT '',
    "socialImage" TEXT NOT NULL DEFAULT '',
    "socialImageAlt" TEXT NOT NULL DEFAULT '',
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "date" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "isAutomated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchVector" tsvector,

    CONSTRAINT "Blog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "codeLink" TEXT,
    "blogLink" TEXT,
    "image" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'Live',
    "appType" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'Production',
    "hostingProvider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hostedUrl" TEXT,
    "blogLink" TEXT,
    "image" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "thumbnail" TEXT,
    "description" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "prompt" TEXT,
    "response" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cron" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'user',
    "schedule" TEXT NOT NULL DEFAULT '0 0 * * *',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "action" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "webhookUrlType" TEXT NOT NULL DEFAULT 'fixed',
    "webhookMethod" TEXT NOT NULL DEFAULT 'POST',
    "webhookHeaders" JSONB NOT NULL DEFAULT '[]',
    "webhookHeadersType" TEXT NOT NULL DEFAULT 'fixed',
    "webhookBody" TEXT,
    "webhookBodyType" TEXT NOT NULL DEFAULT 'fixed',
    "webhookEnv" JSONB NOT NULL DEFAULT '[]',
    "lastRun" TIMESTAMP(3),
    "lastRunStatus" TEXT,
    "lastRunLog" TEXT,
    "nextRun" TIMESTAMP(3),
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationOn" TEXT NOT NULL DEFAULT 'always',
    "retryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "retryType" TEXT NOT NULL DEFAULT 'stable',
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cron_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "cronId" TEXT NOT NULL,
    "cronName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "url" TEXT,
    "log" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "isPredefined" BOOLEAN NOT NULL DEFAULT false,
    "variants" JSONB NOT NULL,
    "previewImage" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT 'Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Config" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "encryptedGithubToken" TEXT,
    "encryptedGeminiApiKey" TEXT,
    "encryptedGroqApiKey" TEXT,
    "encryptedOpenRouterApiKey" TEXT,
    "blogApiTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ads" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "About" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "About_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Home" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Header" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHub" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronEnv" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronEnv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blog_published_createdAt_idx" ON "Blog"("published", "createdAt");

-- CreateIndex
CREATE INDEX "Blog_createdAt_idx" ON "Blog"("createdAt");

-- CreateIndex
CREATE INDEX "Blog_slug_idx" ON "Blog"("slug");

-- CreateIndex
CREATE INDEX "Blog_updatedAt_idx" ON "Blog"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_displayOrder_year_idx" ON "Project"("displayOrder", "year");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_slug_idx" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Deployment_displayOrder_updatedAt_idx" ON "Deployment"("displayOrder", "updatedAt");

-- CreateIndex
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- CreateIndex
CREATE INDEX "Deployment_slug_idx" ON "Deployment"("slug");

-- CreateIndex
CREATE INDEX "Gallery_isPinned_order_createdAt_idx" ON "Gallery"("isPinned", "order", "createdAt");

-- CreateIndex
CREATE INDEX "Gallery_createdAt_idx" ON "Gallery"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_read_createdAt_idx" ON "ContactMessage"("read", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");

-- CreateIndex
CREATE INDEX "AiLog_createdAt_idx" ON "AiLog"("createdAt");

-- CreateIndex
CREATE INDEX "AiLog_provider_createdAt_idx" ON "AiLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "CronLog_cronId_ranAt_idx" ON "CronLog"("cronId", "ranAt");

-- CreateIndex
CREATE INDEX "CronLog_status_idx" ON "CronLog"("status");

-- CreateIndex
CREATE INDEX "CronLog_ranAt_idx" ON "CronLog"("ranAt");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Theme_createdAt_idx" ON "Theme"("createdAt");

-- CreateIndex
CREATE INDEX "Theme_isCustom_createdAt_idx" ON "Theme"("isCustom", "createdAt");

-- AddForeignKey
ALTER TABLE "CronLog" ADD CONSTRAINT "CronLog_cronId_fkey" FOREIGN KEY ("cronId") REFERENCES "Cron"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Full-text search + case-insensitive title uniqueness (Aiyu custom) ───

-- Case-insensitive uniqueness on blog titles (replaces Mongoose
-- collation:{locale:'en',strength:2} unique index). Dependency-free
-- functional unique index — no citext extension required.
CREATE UNIQUE INDEX "Blog_title_lower_key" ON "Blog" (lower("title"));

-- Full-text search vector maintained by a trigger (immutability-safe,
-- works across all PostgreSQL versions). Weighted: title > tags > content.
CREATE OR REPLACE FUNCTION blog_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW."tags", ARRAY[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."content", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "content", "tags"
  ON "Blog"
  FOR EACH ROW EXECUTE FUNCTION blog_search_vector_update();

CREATE INDEX "Blog_searchVector_idx" ON "Blog" USING GIN ("searchVector");
