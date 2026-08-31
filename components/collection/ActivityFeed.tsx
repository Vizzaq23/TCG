import Link from "next/link";
import {
  activityShelfHref,
  formatActivityEvent,
  formatRelativeTime,
  type ActivityEventRow,
} from "@/lib/activity";

type Props = {
  events: ActivityEventRow[];
  /** Public profile username — used to deep-link activity to shelf cards. */
  username: string;
};

export function ActivityFeed({ events, username }: Props) {
  if (!events.length) {
    return (
      <p className="empty-state px-4 py-7 text-center text-sm">
        No public activity yet.
      </p>
    );
  }

  return (
    <ol className="surface-card space-y-0 divide-y divide-zinc-800/80 overflow-hidden rounded-[18px]">
      {events.map((event) => {
        const href = activityShelfHref(username, event);
        const label = formatActivityEvent(event);
        return (
          <li
            key={event.id}
            className="flex items-start justify-between gap-4 px-4 py-3"
          >
            {href ? (
              <Link
                href={href}
                className="text-sm text-zinc-200 underline-offset-2 transition hover:text-amber-200 hover:underline"
              >
                {label}
              </Link>
            ) : (
              <p className="text-sm text-zinc-200">{label}</p>
            )}
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
