import { PrismaClient } from '@/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

const DB_KEEPALIVE_MS = 45_000;
let keepAliveFailCount = 0;

const keepAliveTimer = setInterval(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    keepAliveFailCount = 0;
  } catch (e: any) {
    keepAliveFailCount++;
    if (keepAliveFailCount >= 3) {
      console.warn(`[DB] keepalive failed ${keepAliveFailCount} times: ${e.code || e.message}`);
    }
  }
}, DB_KEEPALIVE_MS);

keepAliveTimer.unref?.();

export function stopDbKeepAlive() {
  clearInterval(keepAliveTimer);
}
