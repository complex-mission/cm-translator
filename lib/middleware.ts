import { cookies } from 'next/headers';
import { verifyAccessToken } from './auth';
import { db } from './db';

// --- Auth helper for API routes ---
export interface AuthUser {
  id: bigint;
  email: string;
  nickname: string;
  role: string;
  status: string;
  avatarId: number;
  dailyQuota: number;
  privacyMode: boolean;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true, email: true, nickname: true, role: true,
      status: true, avatarId: true, dailyQuota: true, privacyMode: true,
    },
  });

  if (!user || user.status !== 'active') return null;
  return user as AuthUser;
}

// --- Avatar helper ---
export function getAvatarUrl(avatarId: number): string {
  return `/avatar/a-${avatarId}.webp`;
}

export function getRandomAvatarId(): number {
  return Math.floor(Math.random() * 30) + 1;
}
