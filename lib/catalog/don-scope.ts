/** Only the two Premium Booster DON!! collections are featured in the catalog. */
export const PRB_DON_GROUPS = { 23496: "PRB01", 24305: "PRB02" } as const;

export function isPrbDonGroup(groupId: number): boolean {
  return Object.hasOwn(PRB_DON_GROUPS, groupId);
}

export function isVisibleCatalogCard(card: { type: string | null; set_name: string | null }): boolean {
  return card.type !== "DON!!" || /\bPRB[-\s]?0?[12](?!\d)/i.test(card.set_name ?? "");
}

// A static PostgREST clause; no user input is interpolated here.
export const CATALOG_DON_FILTER = 'type.is.null,type.neq."DON!!",set_name.imatch."PRB[-[:space:]]?0?[12]([^[:digit:]]|$)"';
