// middleware.ts (simplified)
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

  // Define protected routes that require authentication
  const isProtectedRoute = 
    path === '/dashboard' || 
    path === '/reviews/new' || 
    (path.startsWith('/reviews/') && !path.endsWith('/reviews'));

  // Define auth routes (login/register) where we redirect away if already authenticated
  const isAuthRoute = path === '/login' || path === '/register';

  // If trying to access a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(redirectUrl);
  }

  // If trying to access login/register while already authenticated, redirect to dashboard
  if (isAuthRoute && session) {
    // Check if there's a redirectedFrom in query and use it
    const { searchParams } = req.nextUrl;
    const redirectedFrom = searchParams.get('redirectedFrom');
    
    if (redirectedFrom) {
      // Redirect to the original requested page
      return NextResponse.redirect(new URL(redirectedFrom, req.url));
    }
    
    // Default to dashboard
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