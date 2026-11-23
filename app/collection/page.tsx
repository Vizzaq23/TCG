import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { CollectionInventory } from "@/components/collection/CollectionInventory";
import { CopyShareLink } from "@/components/collection/CopyShareLink";
import { CollectionImportDialog } from "@/components/collection/CollectionImportDialog";

import { SetProgress } from "@/components/collection/SetProgress";
import { TradeAlertsPanel } from "@/components/trades/TradeAlertsPanel";
import { CollectionValueCard } from "@/components/prices/CollectionValueCard";
import { computeSetProgress } from "@/lib/collection/set-progress";
import {
  buildCollectionValueItems,
  summarizeCollectionValue,
} from "@/lib/prices/collection-value";
import type { PriceVariantRow } from "@/lib/prices/select-display-price";
import type { CollectionStatsRow, TradeAlertHitRow } from "@/lib/types/database";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { isShopOwner } from "@/lib/shop/config";
import { readCatalogMetadata, type CatalogMetadata } from "@/lib/catalog-query";

export default async function CollectionPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase environment variables to use your collection.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {profileError?.message ?? "Profile not found. Try signing out and back in."}
        </p>
      </PageContainer>
    );
  }

  const { data: statsRows, error: statsError } =
    await supabase.rpc("get_collection_stats");

  const stats = (statsRows as CollectionStatsRow[] | null)?.[0] ?? null;

  const { data: rows, error: rowsError } = await supabase
    .from("user_collections")
    .select("*, cards (*)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

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

  const valueSummary = summarizeCollectionValue(
    buildCollectionValueItems(
      (rows ?? []).map((r) => ({
        id: r.id,
        card_id: r.card_id,
        quantity: r.quantity,
        estimated_value_cents: r.estimated_value_cents,
        condition: r.condition,
        is_graded: r.is_graded,
        cards: r.cards
          ? {
              name: r.cards.name,
              set_name: r.cards.set_name,
              card_number: r.cards.card_number,
              market_price_cents: r.cards.market_price_cents,
              market_price_updated_at: r.cards.market_price_updated_at,
            }
          : null,
      })),
      variantsByCard,
    ),
  );

  let catalogCards: CatalogMetadata[] = [];
  let catalogError: string | null = null;
  try {
    catalogCards = await readCatalogMetadata(supabase);
  } catch (error) {
    catalogError = error instanceof Error ? error.message : "The full card catalog could not be loaded.";
  }

  const setProgress = computeSetProgress(
    catalogCards ?? [],
    (rows ?? []).map((r) => ({ card_id: r.card_id })),
  );

  const { data: tradeAlerts } = await supabase
    .from("trade_alerts")
    .select("id, card_id, cards ( name, set_name, card_number )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: alertHits } = await supabase.rpc("get_trade_alert_hits");

  const { count: pendingTradeCount } = await supabase
    .from("trade_offers")
    .select("id", { count: "exact", head: true })
    .eq("to_user_id", user.id)
    .eq("status", "pending");

  return (
    <PageContainer as="main" className="flex flex-col gap-12 py-10 sm:py-14">
      <header className="space-y-5">
        <p className="eyebrow">Collection dashboard</p>
        <SectionHeader
          as="h1"
          title="My collection"
          description={
            profile.display_name
              ? `Signed in as ${profile.display_name}`
              : "Manage quantity, condition, grades, value, and your public shelf."
          }
          actions={
            <>
              <Button href={`/u/${encodeURIComponent(profile.username)}`} size="md">
                View public page
              </Button>
              <Button href="/collection/portfolio" size="md" variant="secondary">
                Portfolio
              </Button>
              <Button href="/collection/trades" size="md" variant="secondary">
                Trades
                {pendingTradeCount ? ` (${pendingTradeCount})` : ""}
              </Button>
              <CollectionImportDialog />
              <CopyShareLink username={profile.username} />

            </>
          }
        />
        {statsError ? (
          <p className="text-sm text-amber-200/90">
            Stats unavailable: {statsError.message}. Apply the latest Supabase migration if
            you have not yet.
          </p>
        ) : (
          <CollectionStats stats={stats} />
        )}
        {(rows?.length ?? 0) > 0 ? <CollectionValueCard summary={valueSummary} /> : null}
      </header>

      <CollectionInventory
        rows={rows ?? []}
        error={rowsError?.message ?? null}
        canListForSale={isShopOwner(user.id)}
      />

      {setProgress.length > 0 && <SetProgress items={setProgress} />}
      {catalogError && <p className="text-sm text-amber-200/90">Set progress unavailable: {catalogError}</p>}

      <section className="space-y-4">
        <SectionHeader
          title="Trade alerts"
          description="Watch catalog cards and see when other collectors mark them for trade."
          actions={
            <Button href="/compare" size="sm" variant="ghost">
              Compare collectors
            </Button>
          }
        />
        <TradeAlertsPanel
          alerts={tradeAlerts ?? []}
          hits={(alertHits ?? []) as TradeAlertHitRow[]}
        />
      </section>
    </PageContainer>
  );
}
