import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/middleware';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const configs = await db.systemConfig.findMany({
    select: { configKey: true, configValue: true },
  });

  return NextResponse.json(configs);
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { configs } = await req.json();

  for (const { configKey, configValue } of configs) {
    await db.systemConfig.upsert({
      where: { configKey },
      update: { configValue, updatedBy: user.id },
      create: { configKey, configValue, updatedBy: user.id },
    });
  }

  return NextResponse.json({ success: true });
}
