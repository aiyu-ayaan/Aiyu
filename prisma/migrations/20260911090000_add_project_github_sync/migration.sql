-- AlterTable
ALTER TABLE "Project" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "repoFullName" TEXT,
ADD COLUMN "repoData" JSONB,
ADD COLUMN "readme" TEXT,
ADD COLUMN "readmeFetchedAt" TIMESTAMP(3),
ADD COLUMN "syncedAt" TIMESTAMP(3),
ADD COLUMN "pinnedFields" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Project_repoFullName_key" ON "Project"("repoFullName");

-- CreateIndex
CREATE INDEX "Project_source_idx" ON "Project"("source");
