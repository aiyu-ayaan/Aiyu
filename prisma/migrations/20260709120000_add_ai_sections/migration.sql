-- CreateTable
CREATE TABLE "AiSkillCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accent" TEXT NOT NULL DEFAULT 'var(--accent-cyan)',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSkill" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "accent" TEXT NOT NULL DEFAULT 'var(--accent-cyan)',
    "blurb" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiCredit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "offer" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL DEFAULT '',
    "noCard" BOOLEAN NOT NULL DEFAULT true,
    "freeApi" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT NOT NULL DEFAULT '',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPrompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSkillCategory_displayOrder_idx" ON "AiSkillCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "AiSkill_categoryId_displayOrder_idx" ON "AiSkill"("categoryId", "displayOrder");

-- CreateIndex
CREATE INDEX "AiRecommendation_displayOrder_idx" ON "AiRecommendation"("displayOrder");

-- CreateIndex
CREATE INDEX "AiCredit_displayOrder_idx" ON "AiCredit"("displayOrder");

-- CreateIndex
CREATE INDEX "AiPrompt_displayOrder_idx" ON "AiPrompt"("displayOrder");

-- AddForeignKey
ALTER TABLE "AiSkill" ADD CONSTRAINT "AiSkill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AiSkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
