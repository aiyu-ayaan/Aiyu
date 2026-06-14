import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient.
 *
 * In development Next.js clears the module registry on every HMR reload, which
 * would otherwise spawn a new client (and a new connection pool) on each edit
 * and exhaust Postgres connections. Caching the instance on `globalThis`
 * survives reloads. In production a single instance is created per server.
 *
 * Connection pooling is controlled via the DATABASE_URL query string, e.g.
 * `...?connection_limit=10&pool_timeout=20`.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__aiyuPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__aiyuPrisma = prisma;
}

export default prisma;
