import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// 应用层 Keep-Alive：定期 ping 重置 MySQL wait_timeout（默认 8h）
const DB_KEEPALIVE_MS = 45_000;
let keepAliveFailCount = 0;

const keepAliveTimer = setInterval(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    keepAliveFailCount = 0;
  } catch (e: any) {
    keepAliveFailCount++;
    if (keepAliveFailCount >= 3) {
      console.warn(`[DB] keepalive 连续失败 ${keepAliveFailCount} 次: ${e.code || e.message}`);
    }
  }
}, DB_KEEPALIVE_MS);

export function stopDbKeepAlive() {
  clearInterval(keepAliveTimer);
}
