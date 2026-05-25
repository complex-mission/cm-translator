import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set, rate limiting will use in-memory fallback');
    return null;
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();
if (process.env.NODE_ENV !== 'production' && redis) globalForRedis.redis = redis;

// --- Rate limiter using Redis sliding window ---
export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  if (!redis) {
    // Fallback to in-memory
    return checkRateLimitMemory(key, limit, windowSec * 1000);
  }

  try {
    const now = Date.now();
    const windowStart = now - windowSec * 1000;
    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, 0, windowStart);
    pipe.zadd(key, now, `${now}:${Math.random()}`);
    pipe.zcard(key);
    pipe.expire(key, windowSec);
    const results = await pipe.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
  } catch (err) {
    console.error('Redis rate limit error:', err);
    // Fail open
    return { allowed: true, remaining: limit };
  }
}

// --- In-memory fallback ---
const memMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimitMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const record = memMap.get(key);
  if (!record || now - record.windowStart > windowMs) {
    memMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1 };
  }
  if (record.count >= limit) return { allowed: false, remaining: 0 };
  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

// --- Daily quota check via Redis ---
export async function getDailyCount(userId: bigint): Promise<number> {
  const key = `daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
  if (!redis) {
    return 0; // fallback, no tracking
  }
  const count = await redis.get(key);
  return parseInt(count || '0', 10);
}

export async function incrementDailyCount(userId: bigint, tokens: number): Promise<void> {
  const key = `daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
  if (!redis) return;
  const pipe = redis.pipeline();
  pipe.incrby(key, 1);
  pipe.incrby(`${key}:tokens`, tokens);
  pipe.expire(key, 86400 * 2);
  pipe.expire(`${key}:tokens`, 86400 * 2);
  await pipe.exec();
}

// --- Guest daily limit via Redis ---
export async function getGuestDailyCount(ip: string): Promise<number> {
  const key = `guest:${ip}:${new Date().toISOString().slice(0, 10)}`;
  if (!redis) return 0;
  const count = await redis.get(key);
  return parseInt(count || '0', 10);
}

export async function incrementGuestDaily(ip: string): Promise<void> {
  const key = `guest:${ip}:${new Date().toISOString().slice(0, 10)}`;
  if (!redis) return;
  await redis.incr(key);
  await redis.expire(key, 86400 * 2);
}
