export type CatalogOption = {
  value: string;
  label: string;
};

const SET_CODE_SUFFIX = /^(.+?)\s*\(([A-Z0-9]+(?:-[A-Z0-9]+)+)\)\s*$/i;
const optionCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function parseSetName(value: string) {
  const match = value.match(SET_CODE_SUFFIX);
  if (!match) return null;

  return {
    code: match[2].toUpperCase(),
    title: match[1].trim(),
  };
}

export function toSetOptions(
  values: (string | null | undefined)[],
): CatalogOption[] {
  return [...new Set(values.filter(Boolean) as string[])]
    .map((value) => {
      const parsed = parseSetName(value);
      return {
        value,
        label: parsed ? `${parsed.code} — ${parsed.title}` : value,
        sortCode: parsed?.code ?? null,
      };
    })
    .sort((a, b) => {
      if (a.sortCode && !b.sortCode) return -1;
      if (!a.sortCode && b.sortCode) return 1;
      return optionCollator.compare(a.label, b.label);
    })
    .map(({ value, label }) => ({ value, label }));
}
