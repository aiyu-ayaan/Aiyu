-- AlterTable
ALTER TABLE "Deployment" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE INDEX "Deployment_projectId_idx" ON "Deployment"("projectId");

-- CreateTable
CREATE TABLE "LegalApp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "packageName" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "deploymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'custom',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'markdown',
    "content" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "effectiveDate" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalApp_slug_key" ON "LegalApp"("slug");

-- CreateIndex
CREATE INDEX "LegalApp_deploymentId_idx" ON "LegalApp"("deploymentId");

-- CreateIndex
CREATE INDEX "LegalDocument_appId_displayOrder_idx" ON "LegalDocument"("appId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_appId_slug_key" ON "LegalDocument"("appId", "slug");

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_appId_fkey" FOREIGN KEY ("appId") REFERENCES "LegalApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
