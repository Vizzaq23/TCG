"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { TradeAlertHitRow } from "@/lib/types/database";

type AlertRow = {
  id: string;
  card_id: string;
  cards: { name: string; set_name: string | null; card_number: string | null } | null;
};

type Props = {
  alerts: AlertRow[];
  hits: TradeAlertHitRow[];
};

type SearchHit = {
  id: string;
  name: string;
  set_name: string | null;
  card_number: string | null;
};

export function TradeAlertsPanel({ alerts, hits }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function search() {
    setMessage(null);
    const q = query.trim();
    if (q.length < 2) {
      setMessage("Type at least 2 characters to search the catalog.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cards")
      .select("id, name, set_name, card_number")
      .ilike("name", `%${q}%`)
      .limit(8);
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setResults(data ?? []);
    if (!data?.length) setMessage("No cards matched.");
  }

  async function addAlert(cardId: string) {
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setMessage("Sign in required.");
      return;
    }
    const { error } = await supabase.from("trade_alerts").insert({
      user_id: user.id,
      card_id: cardId,
    });
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setQuery("");
    setResults([]);
    router.refresh();
  }

  async function removeAlert(id: string) {
    setPending(true);
    const supabase = createClient();
    await supabase.from("trade_alerts").delete().eq("id", id);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {hits.length > 0 ? (
        <div className="rounded-[14px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm font-medium text-emerald-100">
            {hits.length} watchlist hit{hits.length === 1 ? "" : "s"} — currently for trade
          </p>
          <ul className="mt-2 space-y-1 text-sm text-emerald-100/90">
            {hits.map((hit) => (
              <li key={`${hit.alert_id}-${hit.collection_id}`}>
                <Link
                  href={`/u/${encodeURIComponent(hit.owner_username)}?trade=1`}
                  className="underline-offset-2 hover:underline"
                >
                  {hit.card_name}
                </Link>{" "}
                · @{hit.owner_username}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Watch a card" className="flex-1 text-xs">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void search();
              }
            }}
            placeholder="Search by card name…"
            className="py-1.5 text-sm"
          />
        </Field>
        <Button type="button" size="sm" onClick={search} disabled={pending} loading={pending}>
          Search
        </Button>
      </div>
      {message ? <p className="text-sm text-amber-200">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-[14px] border border-zinc-800">
          {results.map((card) => (
            <li
              key={card.id}
              className="flex items-center justify-between gap-3 bg-zinc-900/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{card.name}</p>
                <p className="text-[11px] text-zinc-500">
                  {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => addAlert(card.id)}
                disabled={pending}
              >
                Watch
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {alerts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No saved searches yet. Watch a card to see when someone lists it for trade.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800 overflow-hidden rounded-[14px] border border-zinc-800">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between gap-3 bg-zinc-900/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-white">
                  {alert.cards?.name ?? "Unknown card"}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {[alert.cards?.set_name, alert.cards?.card_number].filter(Boolean).join(" · ") ||
                    alert.card_id}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAlert(alert.id)}
                disabled={pending}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
