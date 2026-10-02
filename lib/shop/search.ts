export function matchesShopSearch(
  title: string,
  query: string | undefined,
  ...details: Array<string | null | undefined>
): boolean {
  return !query || [title, ...details].some((detail) => detail?.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
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
