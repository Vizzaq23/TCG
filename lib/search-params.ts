export type SearchParamValue = string | string[] | undefined;

/**
 * Next.js search params may contain repeated keys. Match URLSearchParams.get()
 * semantics by consistently using the first value.
 */
export function firstSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
