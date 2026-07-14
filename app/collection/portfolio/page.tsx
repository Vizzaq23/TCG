import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { CollectionStatsRow } from "@/lib/types/database";
import { buildHoldings, type PortfolioSnapshot } from "@/lib/portfolio";
import {
  buildCollectionValueItems,
  summarizeCollectionValue,
} from "@/lib/prices/collection-value";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { PortfolioHistory } from "@/components/collection/PortfolioHistory";
import { PortfolioHoldings } from "@/components/collection/PortfolioHoldings";
import { CollectionValueCard } from "@/components/prices/CollectionValueCard";
import { PriceLastUpdated } from "@/components/prices/PriceLastUpdated";
import type { PriceVariantRow } from "@/lib/prices/select-display-price";

export default async function PortfolioPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase to view your portfolio.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection/portfolio");
  }

  const { data: statsRows, error: statsError } =
    await supabase.rpc("get_collection_stats");
  const stats = (statsRows as CollectionStatsRow[] | null)?.[0] ?? null;

  const { data: rows, error: rowsError } = await supabase
    .from("user_collections")
    .select(
      "id, card_id, quantity, estimated_value_cents, condition, is_for_trade, is_graded, cards ( name, set_name, card_number, image_url, market_price_cents, market_price_updated_at )",
    )
    .eq("user_id", user.id);

  const { data: snapshots } = await supabase
    .from("collection_value_snapshots")
    .select("id, total_value_cents, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(60);

  const cardIds = [...new Set((rows ?? []).map((r) => r.card_id))];
  const variantsByCard = new Map<string, PriceVariantRow[]>();
  if (cardIds.length) {
    const { data: priceRows } = await supabase
      .from("card_prices")
      .select(
        "card_id, market_price_cents, printing, condition, price_change_24h_pct, price_change_7d_pct, fetched_at",
      )
      .eq("provider", "justtcg")
      .in("card_id", cardIds);
    for (const row of priceRows ?? []) {
      const list = variantsByCard.get(row.card_id) ?? [];
      list.push(row);
      variantsByCard.set(row.card_id, list);
    }
  }

  const valueItems = buildCollectionValueItems(rows ?? [], variantsByCard);
  const summary = summarizeCollectionValue(valueItems);
  const { valued, unpriced } = buildHoldings(rows ?? []);
  const latestFetch = (rows ?? [])
    .map((r) => r.cards?.market_price_updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) as string | undefined;

  return (
    <PageContainer as="main" className="flex flex-col gap-10 py-8 sm:py-10">
      <SectionHeader
        as="h1"
        title="Portfolio"
        description="Estimated collection value from cached JustTCG market prices (manual overrides win)."
        actions={
          <>
            <Button href="/collection" size="sm" variant="secondary">
              Edit values
            </Button>
            <Button href="/collection/trades" size="sm" variant="ghost">
              Trades
            </Button>
          </>
        }
      />

      <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <p className="text-sm text-zinc-400">
          Prices are cache-first. Operators refresh with{" "}
          <code className="text-zinc-300">npm run prices:sync</code> or{" "}
          <code className="text-zinc-300">POST /api/admin/prices/refresh</code>.
        </p>
        <PriceLastUpdated fetchedAt={latestFetch} className="mt-1 text-[11px] text-zinc-500" />
      </div>

      {statsError ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Stats unavailable: {statsError.message}. Apply the card_prices migration if needed.
        </p>
      ) : (
        <CollectionValueCard summary={summary} />
      )}

      {stats && summary.pricedCards === 0 && stats.portfolio_value_cents ? (
        <p className="text-xs text-zinc-500">
          RPC portfolio total {stats.portfolio_value_cents}¢ (includes denormalized market fields).
        </p>
      ) : null}

      {rowsError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {rowsError.message}
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Value chart</h2>
            <PortfolioHistory snapshots={(snapshots ?? []) as PortfolioSnapshot[]} />
          </section>
          <PortfolioHoldings valued={valued} unpriced={unpriced} />
        </>
      )}
    </PageContainer>
  );
}
