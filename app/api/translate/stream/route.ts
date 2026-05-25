import { NextRequest, NextResponse } from 'next/server';
import { translateStream } from '@/lib/deepseek';
import { translateSchema } from '@/lib/validations';
import { getAuthUser } from '@/lib/middleware';
import { checkRateLimitRedis, getDailyCount, incrementDailyCount, getGuestDailyCount, incrementGuestDaily } from '@/lib/redis';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, sourceLang, targetLang, mode } = translateSchema.parse(body);

    const user = await getAuthUser();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Rate limiting (Redis sliding window)
    const rateKey = user ? `rl:user:${user.id}` : `rl:ip:${ip}`;
    const limit = user ? 30 : 10;
    const { allowed } = await checkRateLimitRedis(rateKey, limit, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    // Daily quota
    if (!user) {
      const guestCount = await getGuestDailyCount(ip);
      if (guestCount >= 10) {
        return NextResponse.json({ error: 'Guest daily limit reached. Please sign up for more.' }, { status: 429 });
      }
      await incrementGuestDaily(ip);
    } else {
      const dailyCount = await getDailyCount(user.id);
      if (dailyCount >= user.dailyQuota) {
        return NextResponse.json({ error: 'Daily quota exceeded.' }, { status: 429 });
      }
    }

    // Start streaming translation
    const { stream } = await translateStream({
      text, sourceLang, targetLang, mode,
      userId: user?.id, ip, userAgent: req.headers.get('user-agent') || undefined,
    });

    // Wrap stream to intercept final chunk for DB save
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
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(value);

            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) {
                  fullTranslation = data.translation || '';
                  tokensUsed = data.tokensUsed || 0;
                  latencyMs = data.latencyMs || 0;
                }
              } catch {}
            }
          }
          controller.close();

          // Background: save record + update daily count
          try {
            await db.translation.create({
              data: {
                userId: user?.id || null,
                sourceLang,
                targetLang,
                sourceText: user?.privacyMode ? null : text,
                translatedText: user?.privacyMode ? null : fullTranslation,
                mode,
                model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
                tokensUsed,
                latencyMs,
                ip,
                userAgent: req.headers.get('user-agent') || undefined,
              },
            });
            if (user) await incrementDailyCount(user.id, tokensUsed);
          } catch (err) {
            console.error('Failed to save translation record:', err);
          }
        } catch (err: any) {
          if (err.name !== 'AbortError') controller.error(err);
        }
      },
    });

    return new NextResponse(wrappedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error('Translate error:', err);
    return NextResponse.json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
}
