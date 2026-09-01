import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedServerUser } from "@/lib/supabase/server-user";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  CollectionStatsRow,
  CreativeProfileFeaturesRow,
  ProfileFollowStatsRow,
} from "@/lib/types/database";
import {
  buildCreatorViewSeries,
  creatorViewTrend,
} from "@/lib/creator";
import { CreatorStudioForm } from "@/components/creator/CreatorStudioForm";
import { CreatorViewChart } from "@/components/creator/CreatorViewChart";
import { CopyShareLink } from "@/components/collection/CopyShareLink";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Creator Studio",
  description: "Creative profile controls and audience insights.",
  robots: { index: false, follow: false },
};

export default async function CreatorStudioPage() {
  if (!isSupabaseConfigured()) notFound();

  const user = await getVerifiedServerUser();
  if (!user) redirect("/login?next=/creator-studio");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) notFound();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 13);

  const [featuresResult, statsResult, followResult, viewsResult] = await Promise.all([
    supabase.rpc("get_profile_creative_features", {
      target_username: profile.username,
    }),
    supabase.rpc("get_collection_stats"),
    supabase.rpc("get_profile_follow_stats", {
      target_username: profile.username,
    }),
    supabase
      .from("collection_views")
      .select("viewed_at")
      .eq("profile_id", user.id)
      .gte("viewed_at", since.toISOString())
      .order("viewed_at", { ascending: true }),
  ]);

  const features = (
    (featuresResult.data ?? []) as CreativeProfileFeaturesRow[]
  )[0];
  if (!features) notFound();

  const stats = ((statsResult.data ?? []) as CollectionStatsRow[])[0];
  const follows = ((followResult.data ?? []) as ProfileFollowStatsRow[])[0];
  const viewSeries = buildCreatorViewSeries(
    (viewsResult.data ?? []).map((row) => row.viewed_at),
    14,
  );
  const trend = creatorViewTrend(viewSeries);
  const creativeSince = new Date(features.granted_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageContainer as="main" className="flex flex-col gap-12 py-9 sm:py-14">
      <header className="creator-studio-hero rounded-[26px] p-6 sm:p-9">
        <p className="creator-kicker">Founding Creative · signal granted {creativeSince}</p>
        <SectionHeader
          as="h1"
          title="Creator Studio"
          description={`A private bridge for @${profile.username}: tune your public dispatch, watch your shelf reach, and share what you are building.`}
          className="mt-3"
          actions={
            <>
              <Button href={`/u/${encodeURIComponent(profile.username)}`} size="md">
                View live profile
              </Button>
              <CopyShareLink username={profile.username} />
            </>
          }
        />
      </header>

      <section className="space-y-4" aria-labelledby="creator-insights-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Audience compass</p>
            <h2
              id="creator-insights-title"
              className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-white"
            >
              Your signal at a glance
            </h2>
          </div>
          <p className="text-xs text-zinc-500">Private to this account</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Views · 7 days" value={String(trend.recent)} hint={trend.label} />
          <StatCard
            label="Followers"
            value={String(Number(follows?.follower_count) || 0)}
            hint="Collectors following your shelf"
          />
          <StatCard
            label="Lifetime reach"
            value={String(Number(stats?.total_collection_views) || 0)}
            hint="Public profile views"
          />
          <StatCard
            label="Shelf depth"
            value={String(Number(stats?.unique_cards_owned) || 0)}
            hint="Unique cards in your collection"
          />
        </div>
        <CreatorViewChart points={viewSeries} />
      </section>

      <CreatorStudioForm features={features} />

      <section className="surface-muted rounded-[20px] p-5 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Keep the shelf moving</p>
          <p className="mt-1 text-xs text-zinc-500">
            Curate your top-three showcase or update the rest of your public identity.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
          <Button href="/collection" size="sm" variant="secondary">Curate showcase</Button>
          <Button href="/settings" size="sm" variant="ghost">Profile settings</Button>
        </div>
      </section>
    </PageContainer>
  );
}
