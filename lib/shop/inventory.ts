import { collectionUnitsPerListing } from "@/lib/shop/kinds";

/** Units still available to sell on a listing after soft holds. */
export function sellableQuantity(
  quantityAvailable: number,
  heldQuantity: number,
): number {
  return Math.max(0, quantityAvailable - Math.max(0, heldQuantity));
}

/**
 * Max listing units that can still be allocated from a collection row.
 * `alreadyListedUnits` is collection-card units already on draft/active listings
 * (including the listing being edited when adjusting).
 */
export function maxListableUnits(input: {
  collectionQuantity: number;
  kind: string;
  alreadyListedCollectionUnits: number;
}): number {
  const per = collectionUnitsPerListing(input.kind);
  if (per <= 0) return Number.POSITIVE_INFINITY;
  const free = Math.max(
    0,
    input.collectionQuantity - Math.max(0, input.alreadyListedCollectionUnits),
  );
  return Math.floor(free / per);
}

export function collectionUnitsForSale(kind: string, listingQty: number): number {
  return collectionUnitsPerListing(kind) * Math.max(0, listingQty);
}

export function stockLabel(_quantity: number): string {
  return "";
}
