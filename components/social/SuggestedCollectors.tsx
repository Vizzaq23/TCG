import Link from "next/link";
import type { SuggestedCollectorRow } from "@/lib/types/database";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { FollowButton } from "@/components/social/FollowButton";
import { SectionHeader } from "@/components/ui/SectionHeader";

type Props = {
  suggestions: SuggestedCollectorRow[];
  errorMessage?: string | null;
};

function suggestionMeta(row: SuggestedCollectorRow): string {
  const parts: string[] = [];
  if (row.shared_cards > 0) {
    parts.push(
      `${row.shared_cards} card${row.shared_cards === 1 ? "" : "s"} in common`,
    );
  } else {
    parts.push("Active collector");
  }
  if (row.follows_you) {
    parts.push("Follows you");
  }
  return parts.join(" · ");
}

export function SuggestedCollectors({ suggestions, errorMessage }: Props) {
  return (
    <section className="space-y-3">
      <SectionHeader
        title="Suggested for you"
        description="Collectors with shelves like yours — or people who already follow you."
        actions={
          <Link
            href="/compare"
            className="text-xs font-medium text-zinc-400 transition hover:text-amber-200"
          >
            Compare shelves
          </Link>
        }
      />

      {errorMessage ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMessage}. Apply the suggested collectors migration if you have
          not yet.
        </p>
      ) : !suggestions.length ? (
        <p className="empty-state px-4 py-7 text-center text-sm">
          No suggestions yet. Add cards to your collection or search for
          collectors above.
        </p>
      ) : (
        <ul className="surface-card divide-y divide-zinc-800/80 overflow-hidden rounded-[18px]">
          {suggestions.map((row) => {
            const title = row.display_name ?? row.username;
            return (
              <li key={row.id} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-white/[0.02]">
                <Link
                  href={`/u/${encodeURIComponent(row.username)}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-500/40"
                >
                  <ProfileAvatar
                    src={row.avatar_url}
                    name={title}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-display truncate text-sm font-medium text-white">
                      {title}
                    </p>
                    <p className="truncate text-xs text-zinc-400">
                      @{row.username}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-amber-200/80">
                      {suggestionMeta(row)}
                    </p>
                  </div>
                </Link>
                <FollowButton
                  username={row.username}
                  initiallyFollowing={row.is_following}
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
