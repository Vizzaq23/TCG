import { type NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import { safeNextPath } from "@/lib/auth/safe-next";

/**
 * Next.js 16 Proxy (Node.js runtime). Prefer this over deprecated Edge middleware
 * so Supabase auth can use the OS certificate store (--use-system-ca).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const requiresAuth =
    pathname.startsWith("/collection") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/settings");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    if (requiresAuth) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const { supabase, supabaseResponse } = await createMiddlewareClient(request);

  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // TLS / network blips (e.g. UNABLE_TO_VERIFY_LEAF_SIGNATURE) should not
    // take down every page — treat as signed-out for this request.
    if (requiresAuth) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    return supabaseResponse;
  }

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
