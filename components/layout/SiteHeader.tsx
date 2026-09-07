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
import { getVerifiedServerUser } from "@/lib/supabase/server-user";
import "./header-nav.css";

export async function SiteHeader() {
  let user: { id: string; email?: string } | null = null;
  let profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    accent: string;
  } | null = null;
  let isCreative = false;

  if (isSupabaseConfigured()) {
    user = await getVerifiedServerUser();
    if (user) {
      const supabase = await createClient();
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, accent")
        .eq("id", user.id)
        .maybeSingle();
      profile = prof;
      if (profile) {
        const { data: creativeRows } = await supabase.rpc(
          "get_profile_creative_features",
          { target_username: profile.username },
        );
        isCreative = Boolean(creativeRows?.length);
      }
    }
  }

  const accent = getProfileAccent(
    profile && isProfileAccent(profile.accent) ? profile.accent : "amber",
  );

  return (
    <header className="manga-site-header sticky top-0 z-40">
      <div className="shelf-header-inner mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="One Piece TCG Shelf home"
          prefetch={false}
          className={cn(
            "manga-brand group flex shrink-0 items-center gap-2.5 text-white",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          )}
        >
          <span
            aria-hidden
            className="manga-brand-mark"
          >
            <span>OP<span className="manga-brand-mark-dot">.</span></span>
          </span>
          <span>
            <span className="manga-brand-title">ONE PIECE</span><span className="manga-brand-subtitle">THE COLLECTOR’S SHELF</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderNav />
          <div className="shelf-header-account">
            {user ? (
              profile ? (
                <AccountMenu
                  username={profile.username}
                  displayName={profile.display_name}
                  avatarUrl={profile.avatar_url}
                  accentColor={accent.swatch}
                  isCreative={isCreative}
                />
              ) : (
                <Button href="/settings" size="sm" variant="ghost" className="ml-1">
                  Account
                </Button>
              )
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
      </div>
    </header>
  );
}
