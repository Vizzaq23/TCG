import { formatUsdCents } from "@/lib/money";
import type { CollectionValueSummary } from "@/lib/prices/collection-value";
import { StatCard } from "@/components/ui/StatCard";

type Props = { summary: CollectionValueSummary };

export function CollectionValueCard({ summary }: Props) {
  return (
    <section className="space-y-4">
      <div className="rounded-[18px] border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-zinc-950 px-5 py-6 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
          Estimated collection value
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {formatUsdCents(summary.estimatedValueCents)}
        </p>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-zinc-500">
          Market price × quantity, unless you set a manual value. Graded slabs show underlying raw
          market only. Not financial advice.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Priced cards" value={String(summary.pricedCards)} />
        <StatCard
          label="Unpriced"
          value={String(summary.unpricedCards)}
          hint={
            summary.unpricedCards > 0
              ? "Waiting on next market refresh"
              : "Fully priced"
          }
        />
        <StatCard
          label="Most valuable"
          value={
            summary.mostValuable?.lineCents != null
              ? formatUsdCents(summary.mostValuable.lineCents)
              : "—"
          }
          hint={summary.mostValuable?.cardName}
        />
        <StatCard
          label="Top set"
          value={
            summary.topBySet[0]
              ? formatUsdCents(summary.topBySet[0].valueCents)
              : "—"
          }
          hint={summary.topBySet[0]?.setName}
        />
      </div>

      {summary.topFive.length > 0 ? (
        <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Top five by value
          </p>
          <ol className="mt-3 space-y-2">
            {summary.topFive.map((item, i) => (
              <li
                key={item.collectionId}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-300">
                  <span className="text-zinc-600">{i + 1}. </span>
                  {item.cardName}
                  {item.quantity > 1 ? ` ×${item.quantity}` : ""}
                </span>
                <span className="flex-shrink-0 tabular-nums text-amber-200/90">
                  {formatUsdCents(item.lineCents)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
