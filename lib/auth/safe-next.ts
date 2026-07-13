const DEFAULT_NEXT = "/collection";

/**
 * Allow only same-origin relative paths. Blocks open redirects.
 */
export function safeNextPath(next: string | null | undefined, fallback = DEFAULT_NEXT): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  return trimmed;
}
