import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Check if the user is authenticated
  if (!token) {
    const url = new URL("/api/auth/signin", request.url);
    url.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(url);
  }

  // Path-based access control
  const path = request.nextUrl.pathname;
  const userRole = token.role;

  // Admin-only paths
  if (path.startsWith("/admin") && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Reviewer paths (both ADMIN and REVIEWER can access)
  if (
    path.includes("/submissions") && 
    path.includes("/status") && 
    userRole !== "ADMIN" && 
    userRole !== "REVIEWER"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Viewer paths (read-only access)
  if (
    userRole === "VIEWER" && 
    (path.includes("/create") || path.includes("/edit"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/submissions/:path*",
    "/reports/:path*"
  ],
};