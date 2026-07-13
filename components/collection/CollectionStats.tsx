import type { CollectionStatsRow } from "@/lib/types/database";
import { StatCard } from "@/components/ui/StatCard";

type Props = { stats: CollectionStatsRow | null };

export function CollectionStats({ stats }: Props) {
  if (!stats) return null;

  const items: { label: string; value: string }[] = [
    { label: "Total cards owned", value: String(stats.total_cards_owned) },
    { label: "Unique cards", value: String(stats.unique_cards_owned) },
    { label: "Public profile views", value: String(stats.total_collection_views) },
    { label: "Cards marked for trade", value: String(stats.cards_marked_for_trade) },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} label={item.label} value={item.value} />
      ))}
    </section>
  );
}
