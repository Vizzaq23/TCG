export const CREATOR_EFFECTS = [
  {
    id: "aurora",
    label: "Holographic haki",
    description: "Prismatic cyan, violet, and treasure-gold light.",
  },
  {
    id: "wanted",
    label: "Wanted poster",
    description: "Warm gold, ink red, and aged bounty-board energy.",
  },
  {
    id: "deep_sea",
    label: "Deep sea",
    description: "A calm Grand Line glow in ocean blue and emerald.",
  },
] as const;

export type CreatorEffectId = (typeof CREATOR_EFFECTS)[number]["id"];

export type CreativeProfileFeatures = {
  is_creative: boolean;
  badge_label: string;
  spotlight_title: string;
  spotlight_message: string;
  profile_effect: string;
  granted_at: string;
};

export type CreatorViewPoint = {
  dateKey: string;
  label: string;
  count: number;
};

export function isCreatorEffect(value: string | null | undefined): value is CreatorEffectId {
  return CREATOR_EFFECTS.some((effect) => effect.id === value);
}

export function normalizeCreatorTitle(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 48);
}

export function normalizeCreatorMessage(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 240);
}

export function creatorEffectClass(value: string | null | undefined): string {
  const effect = isCreatorEffect(value) ? value : "aurora";
  return `creator-effect--${effect.replace("_", "-")}`;
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildCreatorViewSeries(
  viewedAt: string[],
  days = 14,
  now = new Date(),
): CreatorViewPoint[] {
  const safeDays = Math.min(31, Math.max(1, Math.floor(days)));
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));

  const counts = new Map<string, number>();
  for (const value of viewedAt) {
    const viewed = new Date(value);
    if (!Number.isFinite(viewed.getTime()) || viewed < start) continue;
    const key = utcDateKey(viewed);
    if (key > utcDateKey(end)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const dateKey = utcDateKey(date);
    return {
      dateKey,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: counts.get(dateKey) ?? 0,
    };
  });
}

export function creatorViewTrend(points: CreatorViewPoint[]): {
  recent: number;
  previous: number;
  label: string;
} {
  const recent = points.slice(-7).reduce((sum, point) => sum + point.count, 0);
  const previous = points.slice(-14, -7).reduce((sum, point) => sum + point.count, 0);

  if (previous === 0) {
    return {
      recent,
      previous,
      label: recent === 0 ? "Quiet week" : "New reach this week",
    };
  }

  const change = Math.round(((recent - previous) / previous) * 100);
  return {
    recent,
    previous,
    label: `${change >= 0 ? "+" : ""}${change}% vs previous 7 days`,
  };
}
