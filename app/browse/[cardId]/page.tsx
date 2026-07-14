import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CardImage } from "@/components/cards/CardImage";
import { AddToCollectionButton } from "@/components/cards/AddToCollectionButton";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import { MarketPrice } from "@/components/prices/MarketPrice";
import { PriceChangeBadge } from "@/components/prices/PriceChangeBadge";
import { PriceLastUpdated } from "@/components/prices/PriceLastUpdated";
import { parseOptcgNumber } from "@/lib/justtcg/match";
import { selectDisplayPrice, type PriceVariantRow } from "@/lib/prices/select-display-price";

type Props = { params: Promise<{ cardId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cardId } = await params;
  if (!isSupabaseConfigured()) return { title: "Card" };
  const supabase = await createClient();
  const { data } = await supabase.from("cards").select("name").eq("id", cardId).maybeSingle();
  return { title: data?.name ?? "Card" };
}

export default async function CardDetailPage({ params }: Props) {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="text-sm text-amber-100">Configure Supabase to view cards.</p>
      </PageContainer>
    );
  }

  const { cardId } = await params;
  const supabase = await createClient();
  const { data: card, error } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .maybeSingle();

  if (error) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="text-sm text-red-200">{error.message}</p>
      </PageContainer>
    );
  }
  if (!card) notFound();

  const { data: priceRows } = await supabase
    .from("card_prices")
    .select(
      "market_price_cents, printing, condition, price_change_24h_pct, price_change_7d_pct, fetched_at",
    )
    .eq("card_id", card.id)
    .eq("provider", "justtcg");

  const variants = (priceRows ?? []) as PriceVariantRow[];
  const display = selectDisplayPrice({
    variants,
    preferAltPrinting: parseOptcgNumber(card.card_number)?.parallelIndex != null,
    fallbackMarketCents: card.market_price_cents,
    fallbackFetchedAt: card.market_price_updated_at,
  });

  return (
    <PageContainer as="main" className="py-8 sm:py-10">
      <div className="mb-6">
        <Button href="/browse" size="sm" variant="ghost">
          ← Back to browse
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="relative mx-auto aspect-[5/7] w-full max-w-xs overflow-hidden rounded-[16px] border border-zinc-800 bg-zinc-950">
          {card.image_url ? (
            <CardImage
              src={card.image_url}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              No image
            </div>
          )}
        </div>

        <div className="space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              Catalog
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{card.name}</h1>
            <p className="text-sm text-zinc-400">
              {[card.set_name, card.card_number, card.rarity].filter(Boolean).join(" · ")}
            </p>
          </header>

          <div className="space-y-3 rounded-[14px] border border-zinc-800 bg-zinc-900/50 p-4">
            <MarketPrice
              cents={display.marketPriceCents}
              label={display.label}
              printing={display.printing}
              condition={display.condition}
              unavailable={display.unavailable}
            />
            <div className="flex flex-wrap gap-2">
              <PriceChangeBadge changePct={display.priceChange24hPct} windowLabel="24h" />
              <PriceChangeBadge changePct={display.priceChange7dPct} windowLabel="7d" />
            </div>
            <PriceLastUpdated fetchedAt={display.fetchedAt} />
            <p className="text-[11px] text-zinc-600">
              Cached JustTCG market data. Refresh with{" "}
              <code className="text-zinc-400">npm run prices:sync</code>.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {(
              [
                ["Color", card.color],
                ["Type", card.type],
                ["Cost", card.cost],
                ["Power", card.power],
                ["Counter", card.counter],
                ["Attribute", card.attribute],
              ] as const
            ).map(([label, value]) =>
              value ? (
                <div
                  key={label}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2"
                >
                  <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
                  <dd className="text-zinc-200">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>

          <AddToCollectionButton cardId={card.id} />
        </div>
      </div>
    </PageContainer>
  );
}
