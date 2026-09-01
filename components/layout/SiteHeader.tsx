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
    <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/82 shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <Link
          href="/"
          prefetch={false}
          className={cn(
            "group font-display flex shrink-0 items-center gap-2.5 rounded-lg text-sm font-semibold tracking-[-0.02em] text-white sm:text-[15px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
          )}
        >
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-[10px] border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold tracking-wide text-amber-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_24px_rgba(246,199,91,0.08)]"
          >
            OP
          </span>
          <span>
            One Piece <span className="hidden text-zinc-400 transition group-hover:text-zinc-300 sm:inline">TCG Shelf</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderNav />
          {user ? (
            <div className="flex items-center border-l border-zinc-800/80 pl-2 sm:pl-3">
              {profile ? (
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
