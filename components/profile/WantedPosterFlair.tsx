import type { WantedPosterStats } from "@/lib/wanted-poster";
import { formatBerries } from "@/lib/wanted-poster";
import { cn } from "@/lib/cn";

type Props = {
  displayName: string;
  username: string;
  stats: WantedPosterStats;
  accentColor: string;
};

const tierTone: Record<WantedPosterStats["rankTier"], string> = {
  rookie: "text-zinc-300",
  "grand-line": "text-sky-300",
  "new-world": "text-amber-200",
  yonko: "text-rose-300",
};

export function WantedPosterFlair({
  displayName,
  username,
  stats,
  accentColor,
}: Props) {
  return (
    <aside
      className="wanted-poster relative overflow-hidden rounded-[16px] border border-zinc-700/80 bg-[#1a1510] px-4 py-4 sm:px-5"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            -12deg,
            transparent,
            transparent 10px,
            rgba(255,236,205,0.015) 10px,
            rgba(255,236,205,0.015) 11px
          ),
          radial-gradient(ellipse 90% 80% at 50% 0%, ${accentColor}26, transparent 55%)
        `,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 top-3 border-t border-dashed border-zinc-600/50"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 bottom-3 border-b border-dashed border-zinc-600/50"
      />

      <div className="relative space-y-3 text-center sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <p
            className="text-[11px] font-black uppercase tracking-[0.35em]"
            style={{ color: accentColor }}
          >
            Wanted
          </p>
          <p className="text-lg font-semibold tracking-tight text-[#f5e6c8] sm:text-xl">
            {displayName}
          </p>
          <p className="text-xs text-zinc-500">@{username}</p>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Shelf bounty
          </p>
          <p className="mt-0.5 font-serif text-2xl font-bold tracking-tight text-[#f8e7b0] sm:text-3xl">
            {formatBerries(stats.bountyBerries)}
          </p>
          <p className={cn("mt-1 text-sm font-medium", tierTone[stats.rankTier])}>
            {stats.rankTitle}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-left sm:grid-cols-4">
          <Stat label="Unique" value={stats.uniqueCards} />
          <Stat label="Rare hits" value={stats.rareHits} />
          <Stat label="Graded" value={stats.gradedSlabs} />
          <Stat label="Followers" value={stats.followers} />
        </dl>

        <p className="text-[11px] leading-snug text-zinc-600">
          Playful reputation score from shelf size, rares, grades, and followers — not real
          money.
        </p>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-zinc-700/60 bg-black/20 px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-zinc-100">{value}</dd>
    </div>
  );
}
