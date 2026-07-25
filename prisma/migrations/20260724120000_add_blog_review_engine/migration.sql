-- AlterTable
ALTER TABLE "Blog" ADD COLUMN "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "flagReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'CLEAN';

-- CreateIndex
CREATE INDEX "Blog_isFlagged_createdAt_idx" ON "Blog"("isFlagged", "createdAt");
