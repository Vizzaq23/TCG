import type { Database } from "../types/database";

export type CatalogInsert = Database["public"]["Tables"]["cards"]["Insert"];
export type ExistingCatalogIdentity = { id: string; card_number: string | null; tcgplayer_product_id: string | null };
export type MarketplaceProduct = {
  productId: number; groupId: number; name: string; number: string | null;
  cardType: string; rarity: string; colors: string[]; subtypes: string[];
  attribute: string | null; cost: string | null; power: string | null; counter: string | null;
  imageUrl: string; imageAvailable?: boolean; url: string;
};

export const marketplaceGroups: Record<number, string> = {
  24736: "The World's Strongest Warriors (OP-17)",
  24775: "OP-17 Release Event Cards",
  17675: "Promotion card",
};

export function printedNumber(value: string | null | undefined): string | null {
  const match = value?.trim().match(/^((?:OP|ST|EB|PRB)\d{2}|P)-(\d{3})$/i);
  return match ? `${match[1].toUpperCase()}-${match[2]}` : null;
}

function normalizeName(value: string): string {
  return value.replaceAll("&amp;", "&").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** A base number identifies a card design, not a promo or alternate printing. */
export function marketplaceCatalogNumber(product: MarketplaceProduct, english: ReadonlyMap<string, Pick<CatalogInsert, "name">>): string {
  const base = printedNumber(product.number);
  const original = base ? english.get(base) : undefined;
  const numberedName = product.name.replace(/\s*\((?:OP17-)?\d{3}\)\s*$/, "");
  if (product.groupId === 24736 && base?.startsWith("OP17-") && original && normalizeName(numberedName) === normalizeName(original.name)) return base;
  return base ? `${base}_tcg${product.productId}` : `TCG-${product.productId}`;
}

function toMarketplaceCard(product: MarketplaceProduct, cardNumber: string, setName?: string | null): CatalogInsert {
  if (!marketplaceGroups[product.groupId]) throw new Error(`Unsupported marketplace group ${product.groupId}`);
  if (!Number.isSafeInteger(product.productId) || product.productId < 1) throw new Error("Invalid marketplace product ID");
  return {
    card_number: cardNumber, name: product.name, set_name: setName || marketplaceGroups[product.groupId],
    type: product.cardType || "Promo", rarity: product.rarity || null,
    color: product.colors.join("/") || null, attribute: product.attribute,
    cost: product.cost, power: product.power, counter: product.counter,
    image_url: product.imageAvailable === false ? null : product.imageUrl || null, tcgplayer_product_id: String(product.productId),
  };
}

/** Plan additive catalog work. Existing UUIDs, collections and market data are never replaced. */
export function planCatalogSync(english: CatalogInsert[], products: MarketplaceProduct[], existing: ExistingCatalogIdentity[]) {
  const byNumber = new Map(existing.filter(row => row.card_number).map(row => [row.card_number!, row]));
  const byProduct = new Map<string, ExistingCatalogIdentity>();
  const existingProductAliases: { productId: string; cardNumbers: string[] }[] = [];
  for (const row of existing) {
    if (!row.tcgplayer_product_id) continue;
    const prior = byProduct.get(row.tcgplayer_product_id);
    if (prior) {
      // Existing aliases are left untouched; their presence never creates another copy.
      let alias = existingProductAliases.find(item => item.productId === row.tcgplayer_product_id);
      if (!alias) { alias = { productId: row.tcgplayer_product_id, cardNumbers: [prior.card_number ?? prior.id] }; existingProductAliases.push(alias); }
      alias.cardNumbers.push(row.card_number ?? row.id);
      continue;
    }
    byProduct.set(row.tcgplayer_product_id, row);
  }
  const englishByNumber = new Map(english.filter(card => card.card_number).map(card => [card.card_number!, card]));
  const inserts = new Map<string, CatalogInsert>();
  for (const card of english) {
    if (!card.card_number) throw new Error("English source is missing a printing identifier");
    if (!byNumber.has(card.card_number)) inserts.set(card.card_number, { ...card });
  }
  const links: { id: string; cardNumber: string; productId: string }[] = [];
  const mappings: { productId: number; cardNumber: string; match: "existing-product" | "regular-number" | "marketplace-printing" }[] = [];
  const seenProducts = new Set<number>();
  for (const product of products) {
    if (seenProducts.has(product.productId)) throw new Error(`Duplicate product ${product.productId}`);
    seenProducts.add(product.productId);
    const productId = String(product.productId);
    const matched = byProduct.get(productId);
    if (matched) {
      if (!matched.card_number) throw new Error(`Existing product ${productId} has no catalog identifier`);
      mappings.push({ productId: product.productId, cardNumber: matched.card_number, match: "existing-product" });
      continue;
    }
    let number = marketplaceCatalogNumber(product, englishByNumber);
    const numberMatch = byNumber.get(number);
    if (numberMatch?.tcgplayer_product_id && numberMatch.tcgplayer_product_id !== productId) {
      const base = printedNumber(product.number);
      number = base ? `${base}_tcg${productId}` : `TCG-${productId}`;
    }
    const current = byNumber.get(number);
    if (current) {
      if (current.tcgplayer_product_id && current.tcgplayer_product_id !== productId) throw new Error(`Catalog identifier collision: ${number}`);
      links.push({ id: current.id, cardNumber: number, productId });
    } else {
      const pending = inserts.get(number);
      if (pending?.tcgplayer_product_id && pending.tcgplayer_product_id !== productId) throw new Error(`Two products resolve to ${number}`);
      const setName = product.groupId === 24736 ? englishByNumber.get("OP17-001")?.set_name : null;
      inserts.set(number, pending ? { ...pending, tcgplayer_product_id: productId } : toMarketplaceCard(product, number, setName));
    }
    mappings.push({ productId: product.productId, cardNumber: number, match: number === printedNumber(product.number) ? "regular-number" : "marketplace-printing" });
  }
  return { inserts: [...inserts.values()], links, mappings, existingProductAliases };
}
