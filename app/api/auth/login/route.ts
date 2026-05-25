import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createAccessToken, createRefreshToken, setAuthCookies } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { checkRateLimitRedis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Rate limit: 5 failed attempts per 15 min per email
    const { allowed } = await checkRateLimitRedis(`login:${email}`, 5, 15 * 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || user.status !== 'active') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await db.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });

    const accessToken = await createAccessToken(user.id, user.role);
    const refreshToken = await createRefreshToken(
      user.id,
      req.headers.get('x-forwarded-for') || undefined,
      req.headers.get('user-agent') || undefined
    );
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      user: { id: user.id.toString(), email: user.email, nickname: user.nickname, role: user.role, avatarId: user.avatarId },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
