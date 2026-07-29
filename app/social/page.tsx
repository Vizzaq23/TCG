import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  FollowingActivityRow,
  ProfileSearchRow,
} from "@/lib/types/database";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CollectorSearchForm } from "@/components/social/CollectorSearchForm";
import {
  CollectorRow,
  type CollectorRowData,
} from "@/components/social/CollectorRow";
import { FollowingLists } from "@/components/social/FollowingLists";
import { SocialActivityFeed } from "@/components/social/SocialActivityFeed";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

type ProfileLite = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default async function SocialPage({ searchParams }: Props) {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase to use Social.
        </p>
      </PageContainer>
    );
  }

  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().replace(/^@/, "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/social");
  }

  const [{ data: followingRows }, { data: followerRows }, activityResult, searchResult] =
    await Promise.all([
      supabase
        .from("follows")
        .select("following_id, created_at")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("follows")
        .select("follower_id, created_at")
        .eq("following_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_following_activity", { p_limit: 40 }),
      q
        ? supabase.rpc("search_profiles", { q, p_limit: 20 })
        : Promise.resolve({ data: null, error: null }),
    ]);

  const followingIds = (followingRows ?? []).map((r) => r.following_id);
  const followerIds = (followerRows ?? []).map((r) => r.follower_id);
  const allIds = [...new Set([...followingIds, ...followerIds])];

  const profileMap = new Map<string, ProfileLite>();
  if (allIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .in("id", allIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p);
    }
  }

  const followingSet = new Set(followingIds);

  const following: CollectorRowData[] = followingIds
    .map((id) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return { ...p, is_following: true };
    })
    .filter((p): p is CollectorRowData => Boolean(p));

  const followers: CollectorRowData[] = followerIds
    .map((id) => {
      const p = profileMap.get(id);
      if (!p) return null;
      return { ...p, is_following: followingSet.has(id) };
    })
    .filter((p): p is CollectorRowData => Boolean(p));

  const activity = (activityResult.data ?? []) as FollowingActivityRow[];
  const searchHits = (searchResult.data ?? []) as ProfileSearchRow[];

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-8 sm:py-10">
      <SectionHeader
        as="h1"
        title="Social"
        description="Find collectors, follow shelves, and see what friends are adding."
      />

      <section className="space-y-3">
        <SectionHeader
          title="Find collectors"
          description="Search by username or display name."
        />
        <CollectorSearchForm q={q} />
        {q ? (
          searchHits.length ? (
            <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-900/40">
              {searchHits.map((hit) => (
                <CollectorRow key={hit.id} collector={hit} />
              ))}
            </ul>
          ) : (
            <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
              No collectors match “{q}”.
            </p>
          )
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionHeader
          title="Activity"
          description="Recent adds, trade flags, and showcase updates from people you follow."
        />
        {activityResult.error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {activityResult.error.message}. Apply the social follows migration if
            you have not yet.
          </p>
        ) : (
          <SocialActivityFeed events={activity} />
        )}
      </section>

      <FollowingLists following={following} followers={followers} />
    </PageContainer>
  );
}
