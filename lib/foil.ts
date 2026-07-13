export type FoilTier = "none" | "gloss" | "rare" | "super" | "holo" | "manga";

/**
 * Map OPTCG (and common TCG) rarity strings to foil intensity.
 * Higher tiers are checked first so "Super Rare" does not fall through as "Rare".
 */
export function getFoilTier(
  rarity: string | null | undefined,
  cardName?: string | null,
): FoilTier {
  const r = (rarity ?? "").trim().toLowerCase();
  const n = (cardName ?? "").trim().toLowerCase();
  const hay = `${r} ${n}`;

  if (
    hay.includes("manga") ||
    r.includes("treasure") ||
    hay.includes("parallel") ||
    hay.includes("alternate") ||
    hay.includes("alt art")
  ) {
    return "manga";
  }
  if (
    r.includes("secret") ||
    r.includes("sp card") ||
    r === "sp" ||
    /\bsp\b/.test(hay) ||
    /\baa\b/.test(hay)
  ) {
    return "holo";
  }
  if (r.includes("super")) return "super";
  if (r.includes("leader") || r.includes("special") || r.includes("promo")) {
    return "super";
  }
  if (r === "rare" || r.endsWith(" rare") || r.startsWith("rare ")) return "rare";
  if (r.includes("uncommon")) return "gloss";
  if (r.includes("common")) return "none";
  return "gloss";
}

export function foilTierLabel(tier: FoilTier): string {
  switch (tier) {
    case "manga":
      return "Premium foil";
    case "holo":
      return "Holographic";
    case "super":
      return "Foil";
    case "rare":
      return "Gloss";
    default:
      return "";
  }
}
