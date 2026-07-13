"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/auth/safe-next";

/** Sign-in CTA that returns the user to the current page after auth. */
export function HeaderSignInLink() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qs = searchParams.toString();
  const candidate =
    pathname.startsWith("/login") || pathname.startsWith("/signup")
      ? "/collection"
      : `${pathname}${qs ? `?${qs}` : ""}`;
  const next = safeNextPath(candidate);
  const href = `/login?next=${encodeURIComponent(next)}`;

  return (
    <Button href={href} size="sm" className="ml-1">
      Sign in
    </Button>
  );
}
