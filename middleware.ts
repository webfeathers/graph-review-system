// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Check auth condition
  const isProtectedRoute = [
    '/dashboard',
    '/reviews/new'
  ].some(path => req.nextUrl.pathname === path) || 
  req.nextUrl.pathname.startsWith('/reviews/') && !req.nextUrl.pathname.endsWith('/reviews/');

  // Check if user is signed in
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Check if user is already signed in and tries to access login/register
  if ((req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard',
    '/reviews/:path*',
    '/login',
    '/register',
  ],
};