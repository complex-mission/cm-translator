import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { hash, compare } from 'bcryptjs';

function requireSecret(name: string): Uint8Array {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(
      `${name} is required and must be at least 32 characters. Set it in your environment before starting the app.`
    );
  }
  return new TextEncoder().encode(value);
}

const JWT_SECRET = requireSecret('JWT_SECRET');

const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 48;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

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

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export async function createRefreshToken(
  userId: bigint,
  ip?: string,
  userAgent?: string
): Promise<string> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.refreshToken.create({
    data: { userId, tokenHash, ip, userAgent, expiresAt },
  });

  return token;
}

export async function verifyRefreshToken(token: string) {
  if (!token) return null;
  const tokenHash = hashRefreshToken(token);

  const record = await db.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt <= new Date()) return null;
  if (!safeEqualHex(record.tokenHash, tokenHash)) return null;
  if (!record.user || record.user.status !== 'active') return null;

  await db.refreshToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return { user: record.user, tokenId: record.id };
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

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    path: '/api/auth',
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

export async function createVerificationCode(email: string, purpose: 'register' | 'reset' | 'change_email') {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hash(code, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const recent = await db.emailVerification.findFirst({
    where: { email, purpose, createdAt: { gt: new Date(Date.now() - 60_000) } },
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
