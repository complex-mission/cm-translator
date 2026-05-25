import { NextResponse, type NextRequest } from 'next/server';

// Next.js proxy — runs on Edge Runtime, no Node-only deps (Prisma, bcryptjs, etc.)
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.delete('X-Frame-Options');
  response.headers.delete('X-XSS-Protection');
  response.headers.delete('X-Content-Type-Options');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
