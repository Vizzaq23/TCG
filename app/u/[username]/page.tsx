import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  CompareCollectorsRow,
  ProfileFollowRelationshipRow,
  ProfileFollowStatsRow,
  PublicCollectionRow,
  PublicShowcaseRow,
} from "@/lib/types/database";
import { formatGradedBadge, isGradedEntry } from "@/lib/types/grading";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { PublicShelfToolbar } from "@/components/collection/PublicShelfToolbar";
import { ShowcaseGlassCase } from "@/components/collection/ShowcaseGlassCase";
import { ActivityFeed } from "@/components/collection/ActivityFeed";
import {
  ShelfMatchCard,
  ShelfMatchSignInPrompt,
  type ShelfMatchCounts,
} from "@/components/collection/ShelfMatchCard";
import { TradeOfferButton } from "@/components/trades/TradeOfferButton";
import { PageContainer } from "@/components/ui/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { ProfileFollowStats } from "@/components/social/ProfileFollowStats";
import { getProfileAccent, isProfileAccent } from "@/lib/profile";
import type { ActivityEventRow } from "@/lib/activity";
import { MarketPrice } from "@/components/prices/MarketPrice";
import { shelfCardHash } from "@/lib/shelf-links";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ trade?: string; notes?: string; social?: string }>;
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
  const { trade, notes, social } = await searchParams;
  const slug = decodeURIComponent(username).toLowerCase();
  const tradeOnly = trade === "1";
  const notesOnly = !tradeOnly && notes === "1";
  const shelfFilter = tradeOnly ? "trade" : notesOnly ? "notes" : "all";
  const initialSocialList =
    social === "followers" || social === "following" ? social : null;

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, accent, created_at")
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

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  // Skip analytics call when the owner is browsing their own shelf.
  if (!viewer || viewer.id !== profile.id) {
    await supabase.rpc("record_collection_view", {
      target_username: profile.username,
    });
  }

  const [{ data: rows, error }, { data: showcaseRows }, { data: activityRows }, statsResult] =
    await Promise.all([
      supabase.rpc("get_public_collection", {
        target_username: profile.username,
      }),
      supabase.rpc("get_public_showcase", {
        target_username: profile.username,
      }),
      supabase.rpc("get_public_activity", {
        target_username: profile.username,
        p_limit: 15,
      }),
      supabase.rpc("get_profile_follow_stats", {
        target_username: profile.username,
      }),
    ]);

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
  const activity = (activityRows ?? []) as ActivityEventRow[];
  const tradeCount = list.filter((row) => row.is_for_trade).length;
  const notesCount = list.filter((row) => Boolean(row.notes?.trim())).length;
  const filtered = tradeOnly
    ? list.filter((row) => row.is_for_trade)
    : notesOnly
      ? list.filter((row) => Boolean(row.notes?.trim()))
      : list;
  const isOwner = Boolean(viewer && viewer.id === profile.id);
  const isSignedIn = Boolean(viewer);
  const accent = getProfileAccent(
    isProfileAccent(profile.accent) ? profile.accent : "amber",
  );
  const titleName = profile.display_name ?? profile.username;

  const followStats = (
    (statsResult.data ?? []) as ProfileFollowStatsRow[]
  )[0] ?? {
    follower_count: 0,
    following_count: 0,
  };

  let isFollowing = false;
  let followsYou = false;
  let viewerUsername: string | null = null;
  let shelfMatch: ShelfMatchCounts | null = null;

  if (viewer && !isOwner) {
    const [{ data: relationshipRows }, { data: viewerProfile }] =
      await Promise.all([
        supabase.rpc("get_profile_follow_relationship", {
          target_username: profile.username,
        }),
        supabase
          .from("profiles")
          .select("username")
          .eq("id", viewer.id)
          .maybeSingle(),
      ]);

    const relationship = (
      (relationshipRows ?? []) as ProfileFollowRelationshipRow[]
    )[0];
    isFollowing = Boolean(relationship?.is_following);
    followsYou = Boolean(relationship?.follows_you);
    viewerUsername = viewerProfile?.username ?? null;

    if (viewerUsername) {
      const { data: compareRows, error: compareError } = await supabase.rpc(
        "compare_collectors",
        {
          username_a: viewerUsername,
          username_b: profile.username,
        },
      );
      if (!compareError && compareRows) {
        const rows = compareRows as CompareCollectorsRow[];
        shelfMatch = {
          shared: rows.filter((r) => r.owned_by_a && r.owned_by_b).length,
          onlyYou: rows.filter((r) => r.owned_by_a && !r.owned_by_b).length,
          onlyThem: rows.filter((r) => r.owned_by_b && !r.owned_by_a).length,
        };
      }
    }
  }

  const priceCardIds = [
    ...new Set([
      ...list.map((r) => r.card_id),
      ...showcase.map((r) => r.card_id),
    ]),
  ];
  const marketByCardId = new Map<string, number | null>();
  if (priceCardIds.length) {
    const { data: priceCards } = await supabase
      .from("cards")
      .select("id, market_price_cents")
      .in("id", priceCardIds);
    for (const c of priceCards ?? []) {
      marketByCardId.set(c.id, c.market_price_cents);
    }
  }

  const showcaseWithPrices = showcase.map((c) => ({
    ...c,
    market_price_cents: marketByCardId.get(c.card_id) ?? null,
  }));

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-6 sm:py-8">
      <ShowcaseGlassCase cards={showcaseWithPrices} />

      <header
        className="space-y-4 border-b border-zinc-800/80 pb-8"
        style={{
          borderImage: `linear-gradient(90deg, ${accent.swatch}55, transparent) 1`,
        }}
      >
        <div className="flex items-start gap-4">
          <ProfileAvatar
            src={profile.avatar_url}
            name={titleName}
            size="lg"
            accentColor={accent.swatch}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: accent.swatch }}
            >
              Public shelf
            </p>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {titleName}
                </h1>
                <p className="text-sm text-zinc-400">@{profile.username}</p>
                {!statsResult.error ? (
                  <ProfileFollowStats
                    username={profile.username}
                    followerCount={Number(followStats.follower_count) || 0}
                    followingCount={Number(followStats.following_count) || 0}
                    isSignedIn={isSignedIn}
                    initialList={initialSocialList}
                  />
                ) : null}
              </div>
              {isSignedIn && !isOwner ? (
                <div className="flex flex-col items-end gap-1.5">
                  <FollowButton
                    username={profile.username}
                    initiallyFollowing={isFollowing}
                    size="md"
                  />
                  {followsYou ? (
                    <span className="text-[11px] font-medium text-zinc-500">
                      Follows you
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {profile.bio ? (
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {viewerUsername && shelfMatch ? (
        <ShelfMatchCard
          viewerUsername={viewerUsername}
          targetUsername={profile.username}
          counts={shelfMatch}
        />
      ) : !isSignedIn ? (
        <ShelfMatchSignInPrompt targetUsername={profile.username} />
      ) : null}

      <PublicShelfToolbar
        username={profile.username}
        filter={shelfFilter}
        totalCount={list.length}
        filteredCount={filtered.length}
        notesCount={notesCount}
        tradeCount={tradeCount}
      />

      <section className="space-y-3">
        <SectionHeader
          title="Recent activity"
          description="Adds, trade flags, and showcase updates."
        />
        <ActivityFeed events={activity} username={profile.username} />
      </section>

      {!filtered.length ? (
        <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
          {tradeOnly
            ? "No cards are marked for trade right now."
            : notesOnly
              ? "No cards have public notes yet."
              : "This collector has not added any cards yet."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((row) => {
            const graded = isGradedEntry(row);
            return (
              <li
                key={row.collection_id}
                id={shelfCardHash(row.card_id)}
                className="shelf-card-anchor"
              >
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
                    {row.notes?.trim() ? (
                      <p className="line-clamp-2 pt-1 text-xs italic leading-snug text-zinc-400">
                        {row.notes.trim()}
                      </p>
                    ) : null}
                    <div className="pt-2">
                      <MarketPrice
                        cents={marketByCardId.get(row.card_id)}
                        size="sm"
                        label={graded ? "Underlying raw market" : "Market"}
                        unavailable={marketByCardId.get(row.card_id) == null}
                      />
                    </div>
                    {row.is_for_trade ? (
                      <TradeOfferButton
                        collectionId={row.collection_id}
                        cardName={row.card_name}
                        ownerUsername={profile.username}
                        isSignedIn={isSignedIn}
                        isOwner={isOwner}
                      />
                    ) : null}
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
