function normalizeShopSearch(value: string): string {
  return value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)?.join("") ?? "";
}

export function matchesShopSearch(
  title: string,
  query: string | undefined,
  ...details: Array<string | null | undefined>
): boolean {
  if (!query) return true;
  const queryTerms = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!queryTerms.length) return false;
  return queryTerms.every((term) =>
    [title, ...details].some((detail) => detail ? normalizeShopSearch(detail).includes(term) : false),
  );
}

export function activeShopFilters(query?: string, condition?: string) {
  return [
    ...(query ? [{ key: "search" as const, label: `Search: “${query}”`, action: `Remove search filter: “${query}”` }] : []),
    ...(condition ? [{ key: "condition" as const, label: `Condition: ${condition}`, action: `Remove condition filter: ${condition}` }] : []),
  ];
}

export function shopResultLabel(count: number, query?: string, condition?: string): string {
  const noun = count === 1 ? "listing" : "listings";
  return `${count} ${noun} available${query ? ` matching “${query}”` : ""}${condition ? ` in ${condition} condition` : ""}`;
}

export function shopCategoryHref(kind: string | undefined, sort: string | undefined, query: string | undefined, condition: string | undefined): string {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (query) params.set("q", query);
  if (condition) params.set("condition", condition);
  return params.size ? `/shop?${params}` : "/shop";
}
