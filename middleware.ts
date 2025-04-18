// middleware.ts (extremely simplified)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create a Supabase client specifically for the middleware context
  const supabase = createMiddlewareClient({ req, res });
  
  // Get the session
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  // Get the current URL path
  const path = req.nextUrl.pathname;

  // Very simple protection for dashboard only
  if (path === '/dashboard' && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // If user is logged in and tries to access login page, redirect to dashboard
  if ((path === '/login' || path === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // For all other cases, proceed normally
  return res;
}

// Define which routes should invoke this middleware
export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/login',
    '/register',
  ],
};