import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { UsernameForm } from "@/components/collection/UsernameForm";
import { CollectionRow } from "@/components/collection/CollectionRow";
import type { CollectionStatsRow } from "@/lib/types/database";

export default async function CollectionPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to use your collection.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {profileError?.message ?? "Profile not found. Try signing out and back in."}
        </p>
      </main>
    );
  }

  const { data: statsRows, error: statsError } =
    await supabase.rpc("get_collection_stats");

  const stats = (statsRows as CollectionStatsRow[] | null)?.[0] ?? null;

  const { data: rows, error: rowsError } = await supabase
    .from("user_collections")
    .select("*, cards (*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              My collection
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {profile.display_name ? (
                <>
                  Signed in as{" "}
                  <span className="text-zinc-200">{profile.display_name}</span>
                </>
              ) : (
                <>Manage quantity, condition, and your public shelf.</>
              )}
            </p>
          </div>
          <Link
            href={`/u/${encodeURIComponent(profile.username)}`}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-amber-500/50 hover:text-white"
          >
            View public page
          </Link>
        </div>
        {statsError ? (
          <p className="text-sm text-amber-200/90">
            Stats unavailable: {statsError.message}. Apply the latest Supabase migration if
            you have not yet.
          </p>
        ) : (
          <CollectionStats stats={stats} />
        )}
      </header>

      <UsernameForm currentUsername={profile.username} />

      {rowsError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {rowsError.message}
        </p>
      ) : !rows?.length ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-10 text-center">
          <p className="text-sm text-zinc-400">
            You have not added any cards yet. Head to the catalog to start your shelf.
          </p>
          <Link
            href="/browse"
            className="mt-4 inline-flex rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Browse cards
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <CollectionRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </main>
  );
}
