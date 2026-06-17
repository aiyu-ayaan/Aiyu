-- CreateTable
CREATE TABLE "SeoConfig" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "encryptedGoogleServiceAccount" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexingLog" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexingLog_createdAt_idx" ON "IndexingLog"("createdAt");
