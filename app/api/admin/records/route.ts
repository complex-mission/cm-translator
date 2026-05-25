import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';
  const userId = searchParams.get('userId');

  const where: any = {};
  if (userId) where.userId = BigInt(userId);
  if (search) {
    where.OR = [
      { sourceText: { contains: search } },
      { translatedText: { contains: search } },
    ];
  }

  const [records, total] = await Promise.all([
    db.translation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { email: true, nickname: true } } },
    }),
    db.translation.count({ where }),
  ]);

  return NextResponse.json({
    records: records.map((r: any) => ({
      ...r,
      id: r.id.toString(),
      userId: r.userId?.toString(),
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
}
