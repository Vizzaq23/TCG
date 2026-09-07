export type CatalogResolveRow = {
  id: string;
  card_number: string | null;
  tcgplayer_product_id: string | null;
};

export type CatalogResolveInput = { number?: string | null; product?: string | null };
export type CatalogResolveLookup = {
  byProduct: (productId: string) => Promise<readonly CatalogResolveRow[]>;
  byNumber: (cardNumber: string) => Promise<readonly CatalogResolveRow[]>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function boundedNumber(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(trimmed) ? trimmed : null;
}

function productId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && /^[1-9]\d{0,15}$/.test(trimmed) && Number.isSafeInteger(Number(trimmed))
    ? trimmed : null;
}

/** Broaden only the search query, never the identity used to open a card. */
export function catalogResolveSearchPath(number: string | null | undefined): string {
  const safeNumber = boundedNumber(number);
  if (!safeNumber) return "/browse";
  const base = safeNumber.match(/^((?:OP|ST|EB|PRB)\d{2}|P)-(\d{3})(?:_(?:p|r|tcg)\d+)*$/i);
  const query = base ? `${base[1].toUpperCase()}-${base[2]}` : safeNumber;
  return `/browse?${new URLSearchParams({ q: query })}`;
}

function preferredRow(rows: readonly CatalogResolveRow[], number: string | null): CatalogResolveRow | undefined {
  return [...rows].filter((row) => UUID.test(row.id)).sort((a, b) => {
    const exactA = a.card_number === number ? 0 : 1;
    const exactB = b.card_number === number ? 0 : 1;
    return exactA - exactB || a.id.toLowerCase().localeCompare(b.id.toLowerCase());
  })[0];
}

/** Resolve an exact printing to a collectible DB row without inferring a base-printing match. */
export async function resolveCatalogPath(
  input: CatalogResolveInput,
  lookup?: CatalogResolveLookup,
): Promise<string> {
  const number = boundedNumber(input.number);
  const fallback = catalogResolveSearchPath(number);
  if (!lookup || (!number && !input.product?.trim())) return fallback;
  if (input.number?.trim() && !number) return fallback;

  const suppliedProduct = productId(input.product);
  if (input.product?.trim() && !suppliedProduct) return fallback;
  const embedded = number?.match(/(?:_tcg(\d+)$|^TCG-(\d+)$)/i);
  const embeddedProduct = embedded ? productId(embedded[1] ?? embedded[2]) : null;
  if (embedded && !embeddedProduct) return fallback;
  if (embeddedProduct && suppliedProduct && embeddedProduct !== suppliedProduct) return fallback;
  const product = suppliedProduct ?? embeddedProduct;

  try {
    if (product) {
      const matches = (await lookup.byProduct(product))
        .filter((row) => row.tcgplayer_product_id === product);
      const match = preferredRow(matches, number);
      if (match) return `/browse/${match.id}`;
    }
    if (number) {
      const matches = (await lookup.byNumber(number)).filter((row) =>
        row.card_number === number && (!product || !row.tcgplayer_product_id || row.tcgplayer_product_id === product),
      );
      const match = preferredRow(matches, number);
      if (match) return `/browse/${match.id}`;
    }
  } catch {
    // An unavailable catalog must remain navigable without claiming a match.
  }
  return fallback;
}
