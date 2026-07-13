import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { HeaderNav } from "@/components/layout/HeaderNav";
import { HeaderSignInLink } from "@/components/layout/HeaderSignInLink";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
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
  const label = profile?.display_name || profile?.username || user?.email || "?";

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
            <div className="ml-1 flex items-center gap-2 border-l border-zinc-800 pl-2 sm:ml-2 sm:pl-3">
              {profile ? (
                <Link
                  href={`/u/${encodeURIComponent(profile.username)}`}
                  className="flex max-w-[10rem] items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 py-1 pl-1 pr-2.5 transition hover:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                  title={`@${profile.username}`}
                >
                  <ProfileAvatar
                    src={profile.avatar_url}
                    name={label}
                    size="sm"
                    accentColor={accent.swatch}
                  />
                  <span className="hidden truncate text-xs text-zinc-300 sm:inline">
                    @{profile.username}
                  </span>
                </Link>
              ) : null}
              <SignOutButton />
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
