import { NextResponse, NextRequest } from "next/server";

// Lightweight authentication gate. Cookie presence only — actual session
// validation and role authorization happen server-side (auth() in pages,
// layouts, and API routes), which is the correct security boundary.
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  // (/onboarding doubles as the public sign-up page)
  const publicRoutes = ["/", "/login", "/onboarding", "/store"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // API routes that don't require authentication
  // (/api/auth includes NextAuth handlers and the public signup endpoint)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIES.some((name) => req.cookies.has(name));
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js|txt|xml)$).*)",
  ],
};
