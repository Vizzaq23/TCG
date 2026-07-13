import { formatUsdCents } from "@/lib/money";
import { portfolioDeltaLabel } from "@/lib/portfolio";
import { StatCard } from "@/components/ui/StatCard";
import type { CollectionStatsRow } from "@/lib/types/database";

type Props = {
  stats: CollectionStatsRow;
  valuedCount: number;
  unpricedCount: number;
  topLineCents: number;
};

export function PortfolioSummary({
  stats,
  valuedCount,
  unpricedCount,
  topLineCents,
}: Props) {
  const portfolio = stats.portfolio_value_cents ?? 0;
  const delta = portfolioDeltaLabel(portfolio, stats.portfolio_value_cents_30d_ago);

  return (
    <section className="space-y-4">
      <div className="rounded-[18px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-950 px-5 py-6 sm:px-7 sm:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          Estimated portfolio
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {formatUsdCents(portfolio)}
        </p>
        <p
          className={[
            "mt-2 text-sm",
            delta.positive === true
              ? "text-emerald-300"
              : delta.positive === false
                ? "text-red-300"
                : "text-zinc-400",
          ].join(" ")}
        >
          {delta.label}
        </p>
        <p className="mt-3 max-w-xl text-xs leading-relaxed text-zinc-500">
          Values are owner-entered estimates (USD). Totals use quantity × unit price. Not market
          comps — update estimates on your collection cards.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Priced cards" value={String(valuedCount)} />
        <StatCard
          label="Unpriced"
          value={String(unpricedCount)}
          hint={unpricedCount > 0 ? "Add estimates to improve coverage" : "Fully priced"}
        />
        <StatCard
          label="Largest holding"
          value={topLineCents > 0 ? formatUsdCents(topLineCents) : "—"}
        />
        <StatCard
          label="Cards owned"
          value={String(stats.total_cards_owned)}
          hint={`${stats.unique_cards_owned} unique`}
        />
      </div>
    </section>
  );
}
