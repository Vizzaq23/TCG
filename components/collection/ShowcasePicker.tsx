"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardImage } from "@/components/cards/CardImage";
import type { CollectionRowData } from "@/components/collection/CollectionRow";

type Props = {
  rows: CollectionRowData[];
};

type Slot = 1 | 2 | 3;

export function ShowcasePicker({ rows }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slotted = new Map<Slot, CollectionRowData>();
  for (const row of rows) {
    if (row.showcase_slot && row.showcase_slot >= 1 && row.showcase_slot <= 3) {
      slotted.set(row.showcase_slot as Slot, row);
    }
  }

  async function assignSlot(collectionId: string, slot: Slot | null) {
    setError(null);
    setPending(collectionId);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_showcase_slot", {
      p_collection_id: collectionId,
      p_slot: slot,
    });
    setPending(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  if (!rows.length) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Top 3 showcase</h2>
        <p className="text-xs text-zinc-500">
          Pick up to three cards to display in the glass case on your public profile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {([1, 2, 3] as Slot[]).map((slot) => {
          const current = slotted.get(slot);
          const card = current?.cards;

          return (
            <div
              key={slot}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-amber-500/80">
                Slot {slot}
              </p>

              {card && current ? (
                <div className="mb-3 flex gap-2">
                  <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
                    {card.image_url ? (
                      <CardImage
                        src={card.image_url}
                        alt={card.name}
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs font-medium text-white">
                      {card.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-xs text-zinc-500">No card selected</p>
              )}

              <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
                Choose card
                <select
                  value={current?.id ?? ""}
                  disabled={pending !== null}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!value) {
                      if (current) void assignSlot(current.id, null);
                      return;
                    }
                    void assignSlot(value, slot);
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-white outline-none focus:border-amber-500/60"
                >
                  <option value="">— Empty —</option>
                  {rows.map((row) => {
                    const c = row.cards;
                    if (!c) return null;
                    const inOtherSlot =
                      row.showcase_slot &&
                      row.showcase_slot !== slot &&
                      row.showcase_slot >= 1 &&
                      row.showcase_slot <= 3;
                    return (
                      <option key={row.id} value={row.id} disabled={Boolean(inOtherSlot)}>
                        {c.name}
                        {inOtherSlot ? ` (slot ${row.showcase_slot})` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              {current && (
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => assignSlot(current.id, null)}
                  className="mt-2 text-[11px] text-zinc-500 underline-offset-2 hover:text-red-300 hover:underline disabled:opacity-50"
                >
                  Remove from showcase
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </section>
  );
}
