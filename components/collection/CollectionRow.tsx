"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";

type UC = Database["public"]["Tables"]["user_collections"]["Row"];
type Card = Database["public"]["Tables"]["cards"]["Row"];

export type CollectionRowData = UC & { cards: Card | null };

const CONDITIONS = [
  "",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
];

type Props = { row: CollectionRowData };

export function CollectionRow({ row }: Props) {
  const router = useRouter();
  const card = row.cards;
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [condition, setCondition] = useState(row.condition ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [forTrade, setForTrade] = useState(row.is_for_trade);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!card) {
    return null;
  }

  async function save() {
    setMessage(null);
    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);
    setPending("save");
    const supabase = createClient();
    const { error } = await supabase
      .from("user_collections")
      .update({
        quantity: qty,
        condition: condition || null,
        notes: notes.trim() || null,
        is_for_trade: forTrade,
      })
      .eq("id", row.id);
    setPending(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this card from your collection?")) return;
    setMessage(null);
    setPending("remove");
    const supabase = createClient();
    const { error } = await supabase.from("user_collections").delete().eq("id", row.id);
    setPending(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row">
      <div className="flex gap-3 sm:w-64 sm:flex-shrink-0">
        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-950 sm:h-32 sm:w-[5.5rem]">
          {card.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
              No art
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{card.name}</p>
          <p className="text-xs text-zinc-500">
            {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Condition
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
          >
            {CONDITIONS.map((c) => (
              <option key={c || "none"} value={c}>
                {c || "Not set"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2 lg:col-span-2">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
            placeholder="Grading, language, memories…"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2 lg:col-span-1">
          <input
            type="checkbox"
            checked={forTrade}
            onChange={(e) => setForTrade(e.target.checked)}
            className="size-4 rounded border-zinc-600"
          />
          For trade
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:w-36 sm:flex-shrink-0">
        <button
          type="button"
          onClick={save}
          disabled={pending !== null}
          className="rounded-lg bg-amber-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending === "save" ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending !== null}
          className="rounded-lg border border-red-500/50 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-50"
        >
          {pending === "remove" ? "Removing…" : "Remove"}
        </button>
        {message && <p className="text-[11px] text-red-300">{message}</p>}
      </div>
    </li>
  );
}
