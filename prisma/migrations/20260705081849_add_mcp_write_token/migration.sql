-- AlterTable
ALTER TABLE "McpConfig" ADD COLUMN     "mcpTokenHash" TEXT,
ADD COLUMN     "mcpTokenLast4" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mcpTokenUpdatedAt" TIMESTAMP(3);
