type CardRow = { id: string; set_name: string | null };
type CollectionRow = { card_id: string };

export type SetProgressItem = {
  setName: string;
  owned: number;
  total: number;
};

export function computeSetProgress(
  catalogCards: CardRow[],
  ownedRows: CollectionRow[],
): SetProgressItem[] {
  const ownedIds = new Set(ownedRows.map((r) => r.card_id));
  const totals = new Map<string, number>();
  const ownedBySet = new Map<string, Set<string>>();

  for (const card of catalogCards) {
    if (!card.set_name) continue;
    totals.set(card.set_name, (totals.get(card.set_name) ?? 0) + 1);
    if (ownedIds.has(card.id)) {
      const owned = ownedBySet.get(card.set_name) ?? new Set<string>();
      owned.add(card.id);
      ownedBySet.set(card.set_name, owned);
    }
  }

  const setNames = new Set([...totals.keys(), ...ownedBySet.keys()]);

  return [...setNames]
    .sort((a, b) => a.localeCompare(b))
    .map((setName) => ({
      setName,
      owned: ownedBySet.get(setName)?.size ?? 0,
      total: totals.get(setName) ?? 0,
    }))
    .filter((item) => item.total > 0 || item.owned > 0);
}
