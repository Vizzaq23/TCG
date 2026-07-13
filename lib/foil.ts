export type FoilTier = "none" | "gloss" | "rare" | "super" | "holo" | "manga";

/**
 * Map OPTCG (and common TCG) rarity strings to foil intensity.
 * Higher tiers are checked first so "Super Rare" does not fall through as "Rare".
 */
export function getFoilTier(rarity: string | null | undefined): FoilTier {
  if (!rarity) return "none";
  const r = rarity.trim().toLowerCase();

  if (
    r.includes("manga") ||
    r.includes("treasure") ||
    r.includes("parallel") ||
    r.includes("aa") ||
    r.includes("alternate")
  ) {
    return "manga";
  }
  if (r.includes("secret") || r.includes("sp card") || r === "sp") {
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
