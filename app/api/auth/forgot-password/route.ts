import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createVerificationCode } from '@/lib/auth';
import { forgotPasswordSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ message: 'If the email exists, a reset code has been sent' });
    }

    if (user.status === 'banned') {
      return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
    }

    try {
      const code = await createVerificationCode(email, 'reset');

      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: email,
        subject: 'CM Translator - Password Reset Code',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Password Reset</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    return NextResponse.json({ message: 'If the email exists, a reset code has been sent' });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err.message === 'RATE_LIMITED') return NextResponse.json({ error: 'Please wait before requesting another code' }, { status: 429 });
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
