export function matchesShopSearch(title: string, query: string | undefined): boolean {
  return !query || title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}
