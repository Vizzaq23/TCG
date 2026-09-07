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
import { displayCardNumber, tcgplayerProductUrl } from "@/lib/catalog-links";
import { getJourneyForCollectible } from "@/lib/journey/archive";

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
      <PageContainer as="main" className="py-12">
        <p className="surface-card rounded-[18px] border-amber-500/30 p-5 text-sm text-amber-100">Configure Supabase to view cards.</p>
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
      <PageContainer as="main" className="py-12">
        <p className="surface-card rounded-[18px] border-red-500/30 p-5 text-sm text-red-200">{error.message}</p>
      </PageContainer>
    );
  }
  if (!card) notFound();
  const number = displayCardNumber(card.card_number);
  const marketplaceUrl = tcgplayerProductUrl(card.tcgplayer_product_id);
  const journey = getJourneyForCollectible(card.card_number, card.tcgplayer_product_id);

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
    <main className="page-ambient flex flex-1 flex-col">
      <PageContainer className="py-8 sm:py-12 lg:py-14">
      <div className="mb-7">
        <Button href="/browse" size="sm" variant="ghost">
          ← Back to browse
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,31rem)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <div className="surface-card relative overflow-hidden rounded-[24px] p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(246,199,91,0.12),transparent_44%)]" />
          <div className="relative mx-auto aspect-[5/7] w-full max-w-sm overflow-hidden rounded-[16px] border border-white/10 bg-zinc-950 shadow-[0_30px_80px_rgba(0,0,0,0.48)]">
            {card.image_url ? (
              <CardImage
                src={card.image_url}
                alt={card.name}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                No image
              </div>
            )}
          </div>
          <div className="relative mt-6 flex items-center justify-between gap-4 border-t border-zinc-800/70 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Catalog image</p>
            {number ? <p className="font-mono text-xs text-zinc-500">{number}</p> : null}
          </div>
        </div>

        <div className="flex flex-col justify-center space-y-8 py-2 lg:py-8">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">Catalog card</p>
              {card.rarity ? (
                <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200">
                  {card.rarity}
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-5xl">
              {card.name}
            </h1>
            <p className="text-sm leading-6 text-zinc-400 sm:text-base">
              {[card.set_name, number].filter(Boolean).join(" · ")}
            </p>
            {marketplaceUrl && <a href={marketplaceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm text-amber-200 underline underline-offset-4 hover:text-white">View this printing on TCGplayer ↗</a>}
          </header>

          <div className="surface-card space-y-4 rounded-[20px] p-5 sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">Market snapshot</p>
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
                  className="rounded-[14px] border border-zinc-800/80 bg-zinc-950/55 px-4 py-3"
                >
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{label}</dt>
                  <dd className="mt-1 text-zinc-200">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>

          <div className="max-w-sm">
            <AddToCollectionButton cardId={card.id} />
          </div>
          {journey && <div className="border-l-4 border-red-500 bg-zinc-900/70 p-5"><p className="text-xs font-semibold uppercase tracking-widest text-red-300">Beyond the card</p><h2 className="mt-2 text-2xl font-bold text-white">{journey.storyChapter ? "Every card has a story." : "Explore this card in Journey."}</h2><p className="mt-2 text-sm leading-6 text-zinc-400">{journey.storyChapter ? "Step into the manga-inspired reader for character origins, story connections, and chapter references." : "See its artwork, explore related stories, and keep a log of your discoveries."}</p><Button href={"/journey?card="+encodeURIComponent(journey.id)} variant="secondary" className="mt-4">Enter the story ↗</Button></div>}
        </div>
      </div>
      </PageContainer>
    </main>
  );
}
