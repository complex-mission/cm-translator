import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';
  const sourceLang = searchParams.get('sourceLang') || '';
  const targetLang = searchParams.get('targetLang') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const favorites = searchParams.get('favorites') === 'true';

  const where: any = { userId: user.id };

  if (search) {
    where.OR = [
      { sourceText: { contains: search } },
      { translatedText: { contains: search } },
    ];
  }
  if (sourceLang) where.sourceLang = sourceLang;
  if (targetLang) where.targetLang = targetLang;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
  }

  const [records, total] = await Promise.all([
    db.translation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sourceLang: true,
        targetLang: true,
        sourceText: true,
        translatedText: true,
        mode: true,
        model: true,
        tokensUsed: true,
        latencyMs: true,
        createdAt: true,
      },
    }),
    db.translation.count({ where }),
  ]);

  return NextResponse.json({
    records: records.map((r: any) => ({
      ...r,
      id: r.id.toString(),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const ids = searchParams.get('ids')?.split(',').map(BigInt) || [];
  const deleteAll = searchParams.get('all') === 'true';

  if (deleteAll) {
    await db.translation.deleteMany({ where: { userId: user.id } });
  } else if (ids.length > 0) {
    await db.translation.deleteMany({
      where: { userId: user.id, id: { in: ids } },
    });
  }

  return NextResponse.json({ success: true });
}
