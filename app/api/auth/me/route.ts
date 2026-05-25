import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { db } from '@/lib/db';
import { updateProfileSchema } from '@/lib/validations';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, email: true, nickname: true, role: true,
      avatarId: true, privacyMode: true, dailyQuota: true, createdAt: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const usage = await db.usageStat.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });

  return NextResponse.json({
    user: { ...fullUser, id: fullUser!.id.toString() },
    usage: { todayCount: usage?.count || 0, todayTokens: usage?.tokens || 0, dailyQuota: fullUser!.dailyQuota },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    await db.user.update({
      where: { id: user.id },
      data: {
        ...(data.nickname && { nickname: data.nickname }),
        ...(data.avatarId && { avatarId: data.avatarId }),
        ...(data.privacyMode !== undefined && { privacyMode: data.privacyMode }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
