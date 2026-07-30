import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { HeaderSignInLink } from "@/components/layout/HeaderSignInLink";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Button } from "@/components/ui/Button";
import { getProfileAccent, isProfileAccent } from "@/lib/profile";
import { cn } from "@/lib/cn";

export async function SiteHeader() {
  let user: { email?: string } | null = null;
  let profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    accent: string;
  } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, accent")
        .eq("id", data.user.id)
        .maybeSingle();
      profile = prof;
    }
  }

  const accent = getProfileAccent(
    profile && isProfileAccent(profile.accent) ? profile.accent : "amber",
  );

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.25rem] sm:px-6">
        <Link
          href="/"
          className={cn(
            "group flex items-center gap-2 rounded-md text-sm font-semibold tracking-tight text-white sm:text-[15px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          )}
        >
          <span
            aria-hidden
            className="h-5 w-0.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.45)]"
          />
          <span>
            One Piece{" "}
            <span className="text-zinc-400 group-hover:text-zinc-300">TCG Shelf</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderNav />
          {user ? (
            <div className="flex items-center border-l border-zinc-800 pl-2 sm:pl-3">
              {profile ? (
                <AccountMenu
                  username={profile.username}
                  displayName={profile.display_name}
                  avatarUrl={profile.avatar_url}
                  accentColor={accent.swatch}
                />
              ) : (
                <Button href="/settings" size="sm" variant="ghost" className="ml-1">
                  Account
                </Button>
              )}
            </div>
          ) : (
            <Suspense
              fallback={
                <Button href="/login?next=/collection" size="sm" className="ml-1">
                  Sign in
                </Button>
              }
            >
              <HeaderSignInLink />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}
