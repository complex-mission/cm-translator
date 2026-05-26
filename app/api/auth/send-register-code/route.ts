import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createVerificationCode } from '@/lib/auth';
import { checkRateLimitRedis } from '@/lib/redis';

const sendCodeSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const { allowed } = await checkRateLimitRedis(`send-register-code:${ip}`, 5, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many code requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = sendCodeSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const code = await createVerificationCode(email, 'register');

    const { sendEmail } = await import('@/lib/email');
    try {
      await sendEmail({
        to: email,
        subject: 'CM Translator - Email Verification Code',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p>Your verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: 'Verification code sent' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    if (err.message === 'RATE_LIMITED') {
      return NextResponse.json(
        { error: 'Please wait at least 60 seconds before requesting another code.' },
        { status: 429 }
      );
    }
    console.error('Send register code error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
