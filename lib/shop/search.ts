export function matchesShopSearch(
  title: string,
  query: string | undefined,
  ...details: Array<string | null | undefined>
): boolean {
  return !query || [title, ...details].some((detail) => detail?.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
}
