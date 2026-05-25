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

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { nickname: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, email: true, nickname: true, role: true, status: true,
        avatarId: true, dailyQuota: true,
        createdAt: true, updatedAt: true,
        _count: { select: { translations: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u: any) => ({ ...u, id: u.id.toString() })),
    total,
    page,
    pageSize,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, status, role, dailyQuota } = body;

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await db.user.update({
    where: { id: BigInt(userId) },
    data: {
      ...(status && { status }),
      ...(role && { role }),
      ...(dailyQuota !== undefined && { dailyQuota }),
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      adminId: user.id,
      action: 'update_user',
      targetType: 'user',
      targetId: BigInt(userId),
      payload: body,
    },
  });

  return NextResponse.json({ success: true });
}
