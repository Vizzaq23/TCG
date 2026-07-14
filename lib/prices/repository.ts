import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { JustTcgCard } from "@/lib/justtcg/types";
import { dollarsToCents } from "@/lib/money";
import { pickNearMintVariant } from "@/lib/justtcg/match";
import { isPriceFresh } from "@/lib/prices/freshness";
import type { PriceVariantRow } from "@/lib/prices/select-display-price";

type AdminClient = SupabaseClient<Database>;

export type CardPriceRow = {
  id: string;
  card_id: string;
  provider: string;
  external_card_id: string | null;
  external_variant_id: string | null;
  printing: string;
  condition: string;
  market_price_cents: number;
  currency: string;
  price_change_24h_pct: number | null;
  price_change_7d_pct: number | null;
  fetched_at: string;
};

export async function getCardPriceVariants(
  client: AdminClient,
  cardIds: string[],
): Promise<Map<string, PriceVariantRow[]>> {
  const map = new Map<string, PriceVariantRow[]>();
  if (!cardIds.length) return map;

  const { data, error } = await client
    .from("card_prices")
    .select(
      "card_id, market_price_cents, printing, condition, price_change_24h_pct, price_change_7d_pct, fetched_at",
    )
    .eq("provider", "justtcg")
    .in("card_id", cardIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const list = map.get(row.card_id) ?? [];
    list.push({
      market_price_cents: row.market_price_cents,
      printing: row.printing,
      condition: row.condition,
      price_change_24h_pct: row.price_change_24h_pct,
      price_change_7d_pct: row.price_change_7d_pct,
      fetched_at: row.fetched_at,
    });
    map.set(row.card_id, list);
  }
  return map;
}

export async function upsertJustTcgVariants(input: {
  admin: AdminClient;
  cardId: string;
  justTcgCard: JustTcgCard;
  justtcgSetId?: string | null;
}): Promise<{ upserted: number; nmCents: number | null }> {
  const { admin, cardId, justTcgCard, justtcgSetId } = input;
  const fetchedAt = new Date().toISOString();
  let upserted = 0;

  for (const variant of justTcgCard.variants ?? []) {
    if (typeof variant.price !== "number" || !Number.isFinite(variant.price) || variant.price < 0) {
      continue;
    }
    const cents = dollarsToCents(variant.price);
    const printing = variant.printing?.trim() || "Normal";
    const condition = variant.condition?.trim() || "Near Mint";

    const { data: existing } = await admin
      .from("card_prices")
      .select("id, market_price_cents")
      .eq("provider", "justtcg")
      .eq("card_id", cardId)
      .eq("printing", printing)
      .eq("condition", condition)
      .maybeSingle();

    const payload = {
      card_id: cardId,
      provider: "justtcg",
      external_card_id: justTcgCard.uuid || justTcgCard.id,
      external_variant_id: variant.uuid || variant.id || null,
      printing,
      condition,
      market_price_cents: cents,
      currency: "USD",
      price_change_24h_pct:
        typeof variant.priceChange24hr === "number" ? variant.priceChange24hr : null,
      price_change_7d_pct:
        typeof variant.priceChange7d === "number" ? variant.priceChange7d : null,
      fetched_at: fetchedAt,
      updated_at: fetchedAt,
    };

    if (existing?.id) {
      const { error } = await admin.from("card_prices").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
      if (existing.market_price_cents !== cents) {
        await admin.from("card_price_snapshots").insert({
          card_price_id: existing.id,
          market_price_cents: cents,
          recorded_at: fetchedAt,
        });
      }
    } else {
      const { data: inserted, error } = await admin
        .from("card_prices")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (inserted?.id) {
        await admin.from("card_price_snapshots").insert({
          card_price_id: inserted.id,
          market_price_cents: cents,
          recorded_at: fetchedAt,
        });
      }
    }
    upserted += 1;
  }

  const nm = pickNearMintVariant(justTcgCard.variants ?? []);
  const nmCents = nm ? dollarsToCents(nm.price) : null;

  await admin
    .from("cards")
    .update({
      market_price_cents: nmCents,
      market_price_updated_at: fetchedAt,
      justtcg_card_id: justTcgCard.uuid || justTcgCard.id,
      tcgplayer_product_id: justTcgCard.tcgplayerId ?? null,
      justtcg_set_id: justtcgSetId ?? justTcgCard.set ?? null,
    })
    .eq("id", cardId);

  return { upserted, nmCents };
}

export async function listStaleOrUnpricedCards(
  admin: AdminClient,
  opts: {
    limit: number;
    force?: boolean;
    setName?: string;
    cardId?: string;
    cardNumber?: string;
  },
) {
  let q = admin
    .from("cards")
    .select(
      "id, name, card_number, set_name, justtcg_card_id, justtcg_set_id, tcgplayer_product_id, market_price_cents, market_price_updated_at",
    )
    .order("market_price_updated_at", { ascending: true })
    .limit(opts.limit);

  if (opts.cardId) q = q.eq("id", opts.cardId);
  if (opts.cardNumber) q = q.eq("card_number", opts.cardNumber);
  if (opts.setName) q = q.ilike("set_name", `%${opts.setName}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  if (opts.force) return data ?? [];

  return (data ?? []).filter(
    (c) => !isPriceFresh(c.market_price_updated_at) || c.market_price_cents == null,
  );
}
