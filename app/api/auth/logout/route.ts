import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, verifyAccessToken } from '@/lib/auth';
import { revokeAllUserTokens } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      if (payload) {
        await revokeAllUserTokens(payload.userId);
      }
    }

    await clearAuthCookies();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    await clearAuthCookies();
    return NextResponse.json({ success: true });
  }
}
