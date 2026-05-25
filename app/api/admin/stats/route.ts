import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totalUsers, totalTranslations, totalTokensResult] = await Promise.all([
    db.user.count(),
    db.translation.count(),
    db.translation.aggregate({ _sum: { tokensUsed: true } }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTranslations = await db.translation.count({
    where: { createdAt: { gte: today } },
  });

  return NextResponse.json({
    totalUsers,
    totalTranslations,
    todayTranslations,
    totalTokens: totalTokensResult._sum.tokensUsed || 0,
  });
}
