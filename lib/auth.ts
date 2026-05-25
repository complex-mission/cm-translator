import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';
import { nanoid } from 'nanoid';
import { hash, compare } from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-change-me');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-me');

const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// --- Password ---
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

// --- Access Token (JWT) ---
export async function createAccessToken(userId: bigint, role: string): Promise<string> {
  return new SignJWT({ sub: userId.toString(), role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: BigInt(payload.sub!), role: payload.role as string };
  } catch {
    return null;
  }
}

// --- Refresh Token ---
export async function createRefreshToken(
  userId: bigint,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const token = nanoid(64);
  const tokenHash = await hash(token, 10);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.refreshToken.create({
    data: { userId, tokenHash, ip, userAgent, expiresAt },
  });

  return token;
}

export async function verifyRefreshToken(token: string) {
  const tokens = await db.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  for (const record of tokens) {
    const match = await compare(token, record.tokenHash);
    if (match) {
      await db.refreshToken.update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      });
      return { user: record.user, tokenId: record.id };
    }
  }
  return null;
}

export async function revokeRefreshToken(tokenId: bigint) {
  await db.refreshToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: bigint) {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// --- Cookie helpers ---
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/api/auth',
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

// --- Verification codes ---
export async function createVerificationCode(email: string, purpose: 'register' | 'reset' | 'change_email') {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Rate limit: 1 per 60s
  const recent = await db.emailVerification.findFirst({
    where: { email, purpose, createdAt: { gt: new Date(Date.now() - 60000) } },
  });
  if (recent) throw new Error('RATE_LIMITED');

  await db.emailVerification.create({
    data: { email, codeHash, purpose, expiresAt },
  });

  return code;
}

export async function verifyCode(email: string, code: string, purpose: 'register' | 'reset' | 'change_email') {
  const record = await db.emailVerification.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) return false;
  if (record.attempts >= 5) return false;

  const match = await compare(code, record.codeHash);

  if (!match) {
    await db.emailVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return false;
  }

  await db.emailVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return true;
}
