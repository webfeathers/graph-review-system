// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In this simplified middleware, we're disabling the automatic redirects
// and letting the client-side AuthProvider handle all redirects
export async function middleware(req: NextRequest) {
  // Simply pass through all requests without redirecting
  return NextResponse.next();
}

// We're still keeping the matcher to allow re-enabling this middleware later if needed
export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
};