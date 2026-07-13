export const PROFILE_ACCENTS = [
  { id: "amber", label: "Straw gold", swatch: "#f59e0b", soft: "rgba(245,158,11,0.18)" },
  { id: "crimson", label: "Red hair", swatch: "#ef4444", soft: "rgba(239,68,68,0.18)" },
  { id: "ocean", label: "Grand Line", swatch: "#38bdf8", soft: "rgba(56,189,248,0.16)" },
  { id: "emerald", label: "East Blue", swatch: "#34d399", soft: "rgba(52,211,153,0.16)" },
  { id: "gold", label: "Treasure", swatch: "#fbbf24", soft: "rgba(251,191,36,0.18)" },
] as const;

export type ProfileAccentId = (typeof PROFILE_ACCENTS)[number]["id"];

export function isProfileAccent(value: string | null | undefined): value is ProfileAccentId {
  return PROFILE_ACCENTS.some((a) => a.id === value);
}

export function getProfileAccent(value: string | null | undefined) {
  return PROFILE_ACCENTS.find((a) => a.id === value) ?? PROFILE_ACCENTS[0];
}

export function normalizeDisplayName(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, 40);
}

export function normalizeBio(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 280);
}

export function normalizeAvatarUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
