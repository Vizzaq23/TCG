import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SignOutButton } from "@/components/layout/SignOutButton";

const navLink =
  "rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white";

export async function SiteHeader() {
  let user: { email?: string } | null = null;
  let profile: { username: string } | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();
      profile = prof;
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-white sm:text-base"
        >
          One Piece TCG Shelf
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main">
          <Link href="/browse" className={navLink}>
            Browse
          </Link>
          <Link href="/collection" className={navLink}>
            My collection
          </Link>
          {user ? (
            <div className="ml-1 flex items-center gap-2 pl-2 sm:ml-2 sm:pl-3 sm:border-l sm:border-zinc-800">
              {profile && (
                <Link
                  href={`/u/${encodeURIComponent(profile.username)}`}
                  className="hidden max-w-[10rem] truncate text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline sm:inline"
                >
                  @{profile.username}
                </Link>
              )}
              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
