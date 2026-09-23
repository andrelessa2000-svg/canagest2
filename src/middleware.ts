import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const publicas = ["/login", "/registro", "/recuperar", "/redefinir", "/api/auth"];

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (publicas.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token) {
      const url = new URL("/login", req.url);
      if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url, {
        headers: { "x-auth-debug": "token-null" },
      });
    }
  } catch (e) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url, {
      headers: { "x-auth-debug": `err:${String(e).slice(0, 120)}` },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api/auth|manifest\\.webmanifest|sw\\.js|favicon|icon\\.svg|apple-touch-icon\\.png|icons|offline|install|.*\\.(?:png|ico|svg|webmanifest|js|css|json|txt|xml|woff2)).*)",
  ],
};