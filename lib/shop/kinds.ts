export const SHOP_LISTING_KINDS = [
  "single",
  "playset",
  "bulk_lot",
  "rarity_set",
] as const;

export type ShopListingKind = (typeof SHOP_LISTING_KINDS)[number];

export const SHOP_LISTING_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;

export type ShopListingStatus = (typeof SHOP_LISTING_STATUSES)[number];

export const SHOP_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "packed",
  "shipped",
  "cancelled",
  "refunded",
] as const;

export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];

export const SHOP_CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
] as const;

/** How many collection cards one listing unit consumes. */
export function collectionUnitsPerListing(kind: string): number {
  if (kind === "playset") return 4;
  if (kind === "single") return 1;
  return 0;
}

export function isShopListingKind(value: string): value is ShopListingKind {
  return (SHOP_LISTING_KINDS as readonly string[]).includes(value);
}

export function kindLabel(kind: string): string {
  switch (kind) {
    case "single":
      return "Single";
    case "playset":
      return "Playset";
    case "bulk_lot":
      return "Bulk lot";
    case "rarity_set":
      return "C/UC set";
    default:
      return kind;
  }
}
