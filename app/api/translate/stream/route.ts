import { NextRequest, NextResponse } from 'next/server';
import { translateStream } from '@/lib/deepseek';
import { translateSchema } from '@/lib/validations';
import { getAuthUser } from '@/lib/middleware';
import {
  checkRateLimitRedis,
  consumeUserQuota,
  consumeGuestQuota,
  recordDailyTokens,
} from '@/lib/redis';
import { db } from '@/lib/db';

const GUEST_DAILY_LIMIT = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLang, targetLang, mode } = translateSchema.parse(body);

    const user = await getAuthUser();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;

    const rateKey = user ? `rl:user:${user.id}` : `rl:ip:${ip}`;
    const rateLimit = user ? 30 : 10;
    const { allowed: rateAllowed } = await checkRateLimitRedis(rateKey, rateLimit, 60);
    if (!rateAllowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const quota = user
      ? await consumeUserQuota(user.id, user.dailyQuota)
      : await consumeGuestQuota(ip, GUEST_DAILY_LIMIT);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: user
            ? 'Daily quota exceeded.'
            : 'Guest daily limit reached. Please sign up for more.',
          errorCode: user ? 'user_quota' : 'guest_limit',
        },
        { status: 429 }
      );
    }

    const { stream } = await translateStream({ text, sourceLang, targetLang, mode });

    const reader = stream.getReader();
    let fullTranslation = '';
    let tokensUsed = 0;
    let latencyMs = 0;

    const wrappedStream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) {
                  fullTranslation = data.translation || '';
                  tokensUsed = data.tokensUsed || 0;
                  latencyMs = data.latencyMs || 0;
                }
              } catch {
                // Skip malformed SSE frames; upstream may still recover.
              }
            }
          }
          controller.close();

          await persistTranslation({
            userId: user?.id ?? null,
            privacyMode: user?.privacyMode ?? false,
            sourceLang,
            targetLang,
            sourceText: text,
            translatedText: fullTranslation,
            mode,
            tokensUsed,
            latencyMs,
            ip,
            userAgent,
          });

          if (user && tokensUsed > 0) {
            await recordDailyTokens(user.id, tokensUsed);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') controller.error(err);
        }
      },
    });

    return new NextResponse(wrappedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    if (err?.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
    }
    console.error('Translate error:', err);
    return NextResponse.json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
}

interface PersistArgs {
  userId: bigint | null;
  privacyMode: boolean;
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translatedText: string;
  mode: string;
  tokensUsed: number;
  latencyMs: number;
  ip: string;
  userAgent?: string;
}

async function persistTranslation(args: PersistArgs) {
  try {
    await db.translation.create({
      data: {
        userId: args.userId,
        sourceLang: args.sourceLang,
        targetLang: args.targetLang,
        sourceText: args.privacyMode ? null : args.sourceText,
        translatedText: args.privacyMode ? null : args.translatedText,
        mode: args.mode,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
        tokensUsed: args.tokensUsed,
        latencyMs: args.latencyMs,
        ip: args.ip,
        userAgent: args.userAgent,
      },
    });
  } catch (err) {
    console.error('Failed to save translation record:', err);
  }
}
