import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  verifyCode,
} from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { getRandomAvatarId } from '@/lib/middleware';
import { checkRateLimitRedis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { allowed } = await checkRateLimitRedis(`register:${ip}`, 3, 3600);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many registrations. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const { email, password, nickname, code } = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const codeOk = await verifyCode(email, code, 'register');
    if (!codeOk) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const avatarId = getRandomAvatarId();

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        nickname: nickname || email.split('@')[0],
        avatarId,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, nickname: true, role: true, avatarId: true },
    });

    const accessToken = await createAccessToken(user.id, user.role);
    const refreshToken = await createRefreshToken(
      user.id,
      ip,
      req.headers.get('user-agent') || undefined
    );
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      user: {
        id: user.id.toString(),
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        avatarId: user.avatarId,
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
