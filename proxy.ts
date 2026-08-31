import { type NextRequest, NextResponse } from "next/server";
import { createProxyClient } from "@/lib/supabase/proxy";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getVerifiedUser } from "@/lib/supabase/verified-user";

/**
 * Next.js 16 Proxy (Node.js runtime). Prefer this over deprecated Edge middleware
 * so Supabase auth can use the OS certificate store (--use-system-ca).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiresAuth =
    pathname.startsWith("/collection") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/shop/sell") ||
    pathname.startsWith("/shop/orders") ||
    pathname.startsWith("/shop/reports");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (requiresAuth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const { supabase, supabaseResponse } = await createProxyClient(request);

  // Public pages resolve their optional user state inside the server render.
  // Avoid a second Auth API request in Proxy for every browse, metadata, and
  // storefront request; only protected and auth-entry routes need it here.
  if (
    !requiresAuth &&
    pathname !== "/login" &&
    pathname !== "/signup"
  ) {
    return supabaseResponse;
  }

  const user = await getVerifiedUser(supabase);

  if (requiresAuth && !user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
