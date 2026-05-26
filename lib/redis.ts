import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as { redis: Redis | null };

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('REDIS_URL not set, rate limiting and quotas will use in-memory fallback (single-instance only)');
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

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

const RATE_LIMIT_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
local count = redis.call('ZCARD', key)
if count >= limit then
  return {0, 0}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return {1, limit - count - 1}
`;

export async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  if (!redis) {
    return checkRateLimitMemory(key, limit, windowSec * 1000);
  }
  try {
    const now = Date.now();
    const member = `${now}:${Math.random()}`;
    const result = (await redis.eval(
      RATE_LIMIT_LUA,
      1,
      key,
      String(now),
      String(windowSec * 1000),
      String(limit),
      member
    )) as [number, number];
    return { allowed: result[0] === 1, remaining: Math.max(0, result[1]) };
  } catch (err) {
    console.error('Redis rate limit error:', err);
    return { allowed: true, remaining: limit };
  }
}

interface MemRecord {
  timestamps: number[];
}
const memMap = new Map<string, MemRecord>();
const MEM_MAP_MAX = 10_000;

function checkRateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let record = memMap.get(key);
  if (!record) {
    record = { timestamps: [] };
    memMap.set(key, record);
  }
  record.timestamps = record.timestamps.filter((t) => t > cutoff);
  if (record.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }
  record.timestamps.push(now);
  if (memMap.size > MEM_MAP_MAX) sweepMemMap(now);
  return { allowed: true, remaining: limit - record.timestamps.length };
}

function sweepMemMap(now: number) {
  for (const [k, v] of memMap) {
    if (!v.timestamps.length || now - v.timestamps[v.timestamps.length - 1] > 60 * 60 * 1000) {
      memMap.delete(k);
    }
  }
}

if (typeof setInterval === 'function') {
  setInterval(() => sweepMemMap(Date.now()), 10 * 60 * 1000).unref?.();
}

function todayKey(prefix: string, id: string | bigint): string {
  return `${prefix}:${id}:${new Date().toISOString().slice(0, 10)}`;
}

export interface QuotaResult {
  allowed: boolean;
  count: number;
}

export async function consumeUserQuota(userId: bigint, limit: number): Promise<QuotaResult> {
  const key = todayKey('daily', userId.toString());
  if (!redis) return consumeMemoryQuota(key, limit);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400 * 2);
    if (count > limit) {
      await redis.decr(key);
      return { allowed: false, count: limit };
    }
    return { allowed: true, count };
  } catch (err) {
    console.error('Redis quota error:', err);
    return { allowed: true, count: 0 };
  }
}

export async function consumeGuestQuota(ip: string, limit: number): Promise<QuotaResult> {
  const key = todayKey('guest', ip);
  if (!redis) return consumeMemoryQuota(key, limit);
  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400 * 2);
    if (count > limit) {
      await redis.decr(key);
      return { allowed: false, count: limit };
    }
    return { allowed: true, count };
  } catch (err) {
    console.error('Redis guest quota error:', err);
    return { allowed: true, count: 0 };
  }
}

const memQuota = new Map<string, { count: number; resetAt: number }>();

function consumeMemoryQuota(key: string, limit: number): QuotaResult {
  const now = Date.now();
  const record = memQuota.get(key);
  if (!record || record.resetAt <= now) {
    memQuota.set(key, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return { allowed: true, count: 1 };
  }
  if (record.count >= limit) return { allowed: false, count: record.count };
  record.count += 1;
  return { allowed: true, count: record.count };
}

export async function recordDailyTokens(userId: bigint, tokens: number): Promise<void> {
  if (!redis || tokens <= 0) return;
  const key = `${todayKey('daily', userId.toString())}:tokens`;
  try {
    await redis.incrby(key, tokens);
    await redis.expire(key, 86400 * 2);
  } catch (err) {
    console.error('Redis token tracking error:', err);
  }
}

export async function getDailyCount(userId: bigint): Promise<number> {
  if (!redis) return 0;
  try {
    const count = await redis.get(todayKey('daily', userId.toString()));
    return parseInt(count || '0', 10);
  } catch {
    return 0;
  }
}
