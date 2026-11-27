-- Code Mode agent tokens (stored as SHA-256 hashes; excluded from backups/exports).

CREATE TABLE "AgentToken" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "lastFour" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'read',
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
  "lastUsedAt" TEXT,
  "revokedAt" TEXT
) STRICT;
CREATE UNIQUE INDEX "AgentToken_tokenHash_key" ON "AgentToken" ("tokenHash");
CREATE INDEX "AgentToken_createdAt_idx" ON "AgentToken" ("createdAt");
