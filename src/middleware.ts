import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnPublic = ["/login", "/registro", "/recuperar", "/redefinir", "/api/auth"].some((p) => 
    req.nextUrl.pathname === p || req.nextUrl.pathname.startsWith(`${p}/`)
  );

  if (isOnPublic) return;
  if (!isLoggedIn) {
    const url = new URL("/login", req.url);
    if (req.nextUrl.pathname !== "/") url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!_next|api/auth|manifest\\.webmanifest|sw\\.js|favicon|icon\\.svg|apple-touch-icon\\.png|icons|offline|install|.*\\.(?:png|ico|svg|webmanifest|js|css|json|txt|xml|woff2)).*)",
  ],
};