import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyCode, revokeAllUserTokens } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = resetPasswordSchema.parse(body);

    const [email, code] = token.split(':');
    if (!email || !code) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
    }

    const isValid = await verifyCode(email, code, 'reset');
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await revokeAllUserTokens(user.id);

    return NextResponse.json({ message: 'Password reset successful' });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
