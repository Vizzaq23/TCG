import type { CollectionStatsRow } from "@/lib/types/database";

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
        <div
          key={item.label}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {item.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{item.value}</p>
        </div>
      ))}
    </section>
  );
}
