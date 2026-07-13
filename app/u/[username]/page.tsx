import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicCollectionRow, PublicShowcaseRow } from "@/lib/types/database";
import { formatGradedBadge, isGradedEntry } from "@/lib/types/grading";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { PublicShelfToolbar } from "@/components/collection/PublicShelfToolbar";
import { ShowcaseGlassCase } from "@/components/collection/ShowcaseGlassCase";
import { PageContainer } from "@/components/ui/PageContainer";
import { Badge } from "@/components/ui/Badge";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ trade?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const slug = decodeURIComponent(username).toLowerCase();
  return {
    title: `@${slug}`,
    description: `One Piece TCG collection for @${slug}`,
    openGraph: {
      title: `@${slug} · One Piece TCG Shelf`,
      description: "View this collector’s One Piece card shelf.",
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Supabase is not configured on this deployment.
        </p>
      </main>
    );
  }

  const { username } = await params;
  const { trade } = await searchParams;
  const slug = decodeURIComponent(username).toLowerCase();
  const tradeOnly = trade === "1";

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .eq("username", slug)
    .maybeSingle();

  if (profileError) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {profileError.message}
        </p>
      </main>
    );
  }

  if (!profile) {
    notFound();
  }

  await supabase.rpc("record_collection_view", {
    target_username: profile.username,
  });

  const { data: rows, error } = await supabase.rpc("get_public_collection", {
    target_username: profile.username,
  });

  const { data: showcaseRows } = await supabase.rpc("get_public_showcase", {
    target_username: profile.username,
  });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}
        </p>
      </main>
    );
  }

  const list = (rows ?? []) as PublicCollectionRow[];
  const showcase = (showcaseRows ?? []) as PublicShowcaseRow[];
  const filtered = tradeOnly ? list.filter((row) => row.is_for_trade) : list;

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-6 sm:py-8">
      <ShowcaseGlassCase cards={showcase} />

      <header className="space-y-2 border-b border-zinc-800/80 pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500/90">
          Public shelf
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {profile.display_name ?? profile.username}
        </h1>
        <p className="text-sm text-zinc-400">
          @{profile.username}
          {profile.display_name && profile.display_name !== profile.username
            ? ` · ${profile.display_name}`
            : ""}
        </p>
      </header>

      <PublicShelfToolbar
        username={profile.username}
        tradeOnly={tradeOnly}
        totalCount={list.length}
        filteredCount={filtered.length}
      />

      {!filtered.length ? (
        <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
          {tradeOnly
            ? "No cards are marked for trade right now."
            : "This collector has not added any cards yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((row) => {
            const graded = isGradedEntry(row);
            return (
              <li key={row.collection_id}>
                <article className="flex flex-col overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-900/60 transition hover:border-zinc-700">
                  <div
                    className={[
                      "relative w-full overflow-hidden bg-zinc-950",
                      graded ? "flex justify-center px-3 py-4" : "aspect-[5/7]",
                    ].join(" ")}
                  >
                    {graded && row.grading_company && row.grade != null ? (
                      <GradedSlab
                        cardName={row.card_name}
                        cardImageUrl={row.image_url}
                        setName={row.set_name}
                        cardNumber={row.card_number}
                        rarity={row.rarity}
                        gradingCompany={row.grading_company}
                        grade={row.grade}
                        certNumber={row.cert_number}
                        isBlackLabel={row.is_black_label}
                        slabImageUrl={row.slab_image_url}
                        size="md"
                        className="!w-[85%] max-w-[11rem]"
                        interactive={false}
                      />
                    ) : row.image_url ? (
                      <CardImage
                        src={row.image_url}
                        className="absolute inset-0 h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <h2 className="line-clamp-2 text-sm font-semibold text-white">
                      {row.card_name}
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      {[row.set_name, row.card_number].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {row.quantity > 1 ? <Badge>×{row.quantity}</Badge> : null}
                      {graded && row.grading_company && row.grade != null ? (
                        <Badge tone="accent">
                          {formatGradedBadge(
                            row.grading_company,
                            row.grade,
                            row.is_black_label,
                          )}
                        </Badge>
                      ) : null}
                      {!graded && row.condition ? (
                        <Badge>{row.condition}</Badge>
                      ) : null}
                      {row.is_for_trade ? (
                        <Badge tone="success">For trade</Badge>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
