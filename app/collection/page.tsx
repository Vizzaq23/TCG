import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { UsernameForm } from "@/components/collection/UsernameForm";
import { CollectionRow } from "@/components/collection/CollectionRow";
import { CopyShareLink } from "@/components/collection/CopyShareLink";
import { SetProgress } from "@/components/collection/SetProgress";
import { ShowcasePicker } from "@/components/collection/ShowcasePicker";
import { computeSetProgress } from "@/lib/collection/set-progress";
import type { CollectionStatsRow } from "@/lib/types/database";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";

export default async function CollectionPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to use your collection.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {profileError?.message ?? "Profile not found. Try signing out and back in."}
        </p>
      </PageContainer>
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

  const { data: catalogCards } = await supabase
    .from("cards")
    .select("id, set_name");

  const setProgress = computeSetProgress(
    catalogCards ?? [],
    (rows ?? []).map((r) => ({ card_id: r.card_id })),
  );

  return (
    <PageContainer as="main" className="flex flex-col gap-10 py-8 sm:py-10">
      <header className="space-y-5">
        <SectionHeader
          as="h1"
          title="My collection"
          description={
            profile.display_name
              ? `Signed in as ${profile.display_name}`
              : "Manage quantity, condition, grades, and your public shelf."
          }
          actions={
            <>
              <Button href={`/u/${encodeURIComponent(profile.username)}`} size="md">
                View public page
              </Button>
              <CopyShareLink username={profile.username} />
            </>
          }
        />
        {statsError ? (
          <p className="text-sm text-amber-200/90">
            Stats unavailable: {statsError.message}. Apply the latest Supabase migration if
            you have not yet.
          </p>
        ) : (
          <CollectionStats stats={stats} />
        )}
      </header>

      {rows && rows.length > 0 && <ShowcasePicker rows={rows} />}

      <section className="space-y-4">
        <SectionHeader
          title="Your cards"
          description="Edit quantities, conditions, grades, and trade status."
        />
        {rowsError ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {rowsError.message}
          </p>
        ) : !rows?.length ? (
          <div className="rounded-[16px] border border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">
              You have not added any cards yet. Head to the catalog to start your shelf.
            </p>
            <div className="mt-5">
              <Button href="/browse">Browse cards</Button>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <CollectionRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </section>

      {setProgress.length > 0 && <SetProgress items={setProgress} />}

      <UsernameForm currentUsername={profile.username} />
    </PageContainer>
  );
}
