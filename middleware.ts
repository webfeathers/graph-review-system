// middleware.ts (fixed)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Create a Supabase client specifically for the middleware context
  const supabase = createMiddlewareClient({ req, res });
  
  // Get the session - using await to properly resolve the promise
  const { data: { session } } = await supabase.auth.getSession();

  // Get the current URL path
  const path = req.nextUrl.pathname;

  // Debug logging (visible in server console)
  console.log(`Middleware checking path: ${path}, session exists: ${!!session}`);

  // Define protected routes that require authentication
  const isProtectedRoute = 
    path === '/dashboard' || 
    path === '/reviews/new' || 
    (path.startsWith('/reviews/') && path !== '/reviews/' && !path.endsWith('/reviews'));

  // Define auth routes (login/register) where we redirect away if already authenticated
  const isAuthRoute = path === '/login' || path === '/register';

  // If trying to access a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    console.log('Redirecting to login: Protected route accessed without session');
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If trying to access login/register while already authenticated, redirect to dashboard
  if (isAuthRoute && session) {
    console.log('Redirecting to dashboard: Auth route accessed with active session');
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
    '/reviews/:path*',
    '/login',
    '/register',
  ],
};