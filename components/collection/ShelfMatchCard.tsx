import Link from "next/link";
import { Button } from "@/components/ui/Button";

export type ShelfMatchCounts = {
  shared: number;
  onlyYou: number;
  onlyThem: number;
};

type Props = {
  viewerUsername: string;
  targetUsername: string;
  counts: ShelfMatchCounts;
};

export function ShelfMatchCard({
  viewerUsername,
  targetUsername,
  counts,
}: Props) {
  const compareHref = `/compare?a=${encodeURIComponent(viewerUsername)}&b=${encodeURIComponent(targetUsername)}`;

  return (
    <aside className="surface-card rounded-[18px] px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-500/80">
            Shelf match
          </p>
          <p className="text-sm text-zinc-400">
            How your collection lines up with @{targetUsername}.
          </p>
        </div>
        <Button href={compareHref} size="sm" variant="secondary">
          Compare shelves
        </Button>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-[12px] border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-[11px] text-zinc-500">Shared</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">
            {counts.shared}
          </dd>
        </div>
        <div className="rounded-[12px] border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-[11px] text-zinc-500">Only you</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">
            {counts.onlyYou}
          </dd>
        </div>
        <div className="rounded-[12px] border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
          <dt className="text-[11px] text-zinc-500">Only them</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">
            {counts.onlyThem}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-zinc-600">
        Comparing as @{viewerUsername}.{" "}
        <Link
          href={compareHref}
          className="text-zinc-400 underline-offset-2 hover:text-amber-200 hover:underline"
        >
          Open full compare
        </Link>
      </p>
    </aside>
  );
}

type GuestProps = {
  targetUsername: string;
};

/** Soft CTA when the visitor is signed out. */
export function ShelfMatchSignInPrompt({ targetUsername }: GuestProps) {
  const next = `/u/${encodeURIComponent(targetUsername)}`;
  return (
    <aside className="rounded-[16px] border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-3.5 text-sm text-zinc-500">
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="font-medium text-amber-400/90 underline-offset-2 hover:underline"
      >
        Sign in
      </Link>{" "}
      to see how your shelf matches @{targetUsername}.
    </aside>
  );
}
