import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { FollowButton } from "@/components/social/FollowButton";

export type CollectorRowData = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
};

type Props = {
  collector: CollectorRowData;
  showFollow?: boolean;
};

export function CollectorRow({ collector, showFollow = true }: Props) {
  const title = collector.display_name ?? collector.username;

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={`/u/${encodeURIComponent(collector.username)}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-500/40"
      >
        <ProfileAvatar src={collector.avatar_url} name={title} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          <p className="truncate text-xs text-zinc-400">@{collector.username}</p>
          {collector.bio ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
              {collector.bio}
            </p>
          ) : null}
        </div>
      </Link>
      {showFollow ? (
        <FollowButton
          username={collector.username}
          initiallyFollowing={collector.is_following}
        />
      ) : null}
    </li>
  );
}
