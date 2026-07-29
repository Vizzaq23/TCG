import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import {
  formatActivityEvent,
  formatRelativeTime,
  type ActivityEventRow,
} from "@/lib/activity";
import type { FollowingActivityRow } from "@/lib/types/database";

type Props = { events: FollowingActivityRow[] };

export function SocialActivityFeed({ events }: Props) {
  if (!events.length) {
    return (
      <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
        No activity from people you follow yet.
      </p>
    );
  }

  return (
    <ol className="space-y-0 divide-y divide-zinc-800/80 overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-900/40">
      {events.map((event) => {
        const actorName = event.actor_display_name ?? event.actor_username;
        const activity: ActivityEventRow = {
          id: event.id,
          event_type: event.event_type,
          payload: event.payload,
          created_at: event.created_at,
        };
        return (
          <li key={event.id} className="flex items-start gap-3 px-4 py-3">
            <Link
              href={`/u/${encodeURIComponent(event.actor_username)}`}
              className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              <ProfileAvatar
                src={event.actor_avatar_url}
                name={actorName}
                size="sm"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-200">
                <Link
                  href={`/u/${encodeURIComponent(event.actor_username)}`}
                  className="font-medium text-white hover:text-amber-300"
                >
                  {actorName}
                </Link>
                <span className="text-zinc-400">
                  {" "}
                  · {formatActivityEvent(activity)}
                </span>
              </p>
            </div>
            <time
              dateTime={event.created_at}
              className="flex-shrink-0 text-[11px] tabular-nums text-zinc-500"
            >
              {formatRelativeTime(event.created_at)}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
