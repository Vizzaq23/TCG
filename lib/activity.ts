import type { Json } from "@/lib/types/database";

export type ActivityEventType =
  | "added_card"
  | "marked_trade"
  | "unmarked_trade"
  | "updated_showcase"
  | "updated_value";

export type ActivityEventRow = {
  id: string;
  event_type: ActivityEventType | string;
  payload: Json;
  created_at: string;
};

function cardName(payload: Json): string {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const name = payload.card_name;
    if (typeof name === "string" && name.trim()) return name;
  }
  return "a card";
}

export function formatActivityEvent(event: ActivityEventRow): string {
  const name = cardName(event.payload);
  switch (event.event_type) {
    case "added_card":
      return `Added ${name}`;
    case "marked_trade":
      return `Marked ${name} for trade`;
    case "unmarked_trade":
      return `Removed trade flag on ${name}`;
    case "updated_showcase":
      return `Updated showcase · ${name}`;
    case "updated_value":
      return `Updated value on ${name}`;
    default:
      return `Activity · ${name}`;
  }
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 48) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  return rtf.format(diffMonth, "month");
}
