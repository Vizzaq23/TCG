import { formatUsdCents } from "@/lib/money";
import type { PortfolioSnapshot } from "@/lib/portfolio";
import { PortfolioValueChart } from "@/components/collection/PortfolioValueChart";

type Props = { snapshots: PortfolioSnapshot[] };

export function PortfolioHistory({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
        Value history appears after you save estimated prices. Snapshots are recorded daily when
        your portfolio changes.
      </p>
    );
  }

  const recent = [...snapshots]
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <PortfolioValueChart snapshots={snapshots} />

      <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Recent snapshots
        </p>
        <ul className="divide-y divide-zinc-800/80 overflow-hidden rounded-lg border border-zinc-800/80">
          {recent.map((snap) => (
            <li
              key={snap.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <time dateTime={snap.recorded_at} className="text-zinc-400">
                {new Date(snap.recorded_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="font-medium tabular-nums text-white">
                {formatUsdCents(snap.total_value_cents)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
