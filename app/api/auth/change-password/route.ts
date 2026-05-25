import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/middleware';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, revokeAllUserTokens } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[a-zA-Z]/).regex(/[0-9]/),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { oldPassword, newPassword } = schema.parse(await req.json());

    const fullUser = await db.user.findUnique({ where: { id: user.id } });
    if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const valid = await verifyPassword(oldPassword, fullUser.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

    const newHash = await hashPassword(newPassword);
    await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

    // Revoke all sessions
    await revokeAllUserTokens(user.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
