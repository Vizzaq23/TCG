import type { CollectionStatsRow } from "@/lib/types/database";
import { formatUsdCents } from "@/lib/money";
import { StatCard } from "@/components/ui/StatCard";

type Props = { stats: CollectionStatsRow | null };

export function CollectionStats({ stats }: Props) {
  if (!stats) return null;

  const portfolio = stats.portfolio_value_cents ?? 0;
  const ago = stats.portfolio_value_cents_30d_ago;
  const delta =
    ago != null && Number.isFinite(ago) ? portfolio - Number(ago) : null;
  const deltaLabel =
    delta == null
      ? "No 30-day baseline yet"
      : `${delta >= 0 ? "+" : ""}${formatUsdCents(delta)} vs 30d ago`;

  const items: { label: string; value: string; hint?: string }[] = [
    { label: "Total cards owned", value: String(stats.total_cards_owned) },
    { label: "Unique cards", value: String(stats.unique_cards_owned) },
    {
      label: "Portfolio value",
      value: formatUsdCents(portfolio),
      hint:
        stats.valued_cards_count != null
          ? `${stats.valued_cards_count} priced · ${deltaLabel}`
          : deltaLabel,
    },
    { label: "Public profile views", value: String(stats.total_collection_views) },
    { label: "Cards marked for trade", value: String(stats.cards_marked_for_trade) },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
        />
      ))}
    </section>
  );
}
