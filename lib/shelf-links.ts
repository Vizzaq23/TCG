import type { Json } from "@/lib/types/database";

/** Stable fragment for a card on a public shelf. */
export function shelfCardHash(cardId: string): string {
  return `card-${cardId}`;
}

/**
 * Build a public shelf URL that scrolls to a specific card.
 * Example: /u/luffy?trade=1#card-<uuid>
 */
export function shelfCardPath(
  username: string,
  cardId: string,
  options?: { trade?: boolean; notes?: boolean },
): string {
  const params = new URLSearchParams();
  if (options?.trade) params.set("trade", "1");
  if (options?.notes) params.set("notes", "1");
  const qs = params.toString();
  return `/u/${encodeURIComponent(username)}${qs ? `?${qs}` : ""}#${shelfCardHash(cardId)}`;
}

/** Read card_id from an activity event payload, if present. */
export function activityPayloadCardId(payload: Json): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const id = (payload as { card_id?: unknown }).card_id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return null;
}
