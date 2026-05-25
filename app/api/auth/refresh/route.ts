import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, createAccessToken, createRefreshToken, revokeRefreshToken, setAuthCookies } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const result = await verifyRefreshToken(refreshToken);
    if (!result) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    // Rotate: revoke old, issue new
    await revokeRefreshToken(result.tokenId);

    const newAccessToken = await createAccessToken(result.user.id, result.user.role);
    const newRefreshToken = await createRefreshToken(result.user.id, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined);

    await setAuthCookies(newAccessToken, newRefreshToken);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Refresh error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
