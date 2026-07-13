"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import type { CollectionRowData } from "@/components/collection/CollectionRow";
import { isGradedEntry, formatGradedBadge } from "@/lib/types/grading";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/cn";

type Props = {
  rows: CollectionRowData[];
};

type Slot = 1 | 2 | 3;

export function ShowcasePicker({ rows }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSlot, setSavedSlot] = useState<Slot | null>(null);

  const slotted = new Map<Slot, CollectionRowData>();
  for (const row of rows) {
    if (row.showcase_slot && row.showcase_slot >= 1 && row.showcase_slot <= 3) {
      slotted.set(row.showcase_slot as Slot, row);
    }
  }

  async function assignSlot(collectionId: string, slot: Slot | null) {
    setError(null);
    setPending(collectionId);
    setSavedSlot(null);
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
    if (slot) setSavedSlot(slot);
    router.refresh();
  }

  if (!rows.length) return null;

  return (
    <section className="overflow-hidden rounded-[16px] border border-[rgba(255,236,205,0.08)] bg-[linear-gradient(180deg,#141210_0%,#0c0b0a_100%)]">
      <div className="border-b border-zinc-800/80 px-4 py-4 sm:px-5">
        <SectionHeader
          title="Collector's Showcase"
          description="Choose up to three prized collectibles for your public profile — raw cards or graded slabs. Changes save automatically."
        />
        {savedSlot ? (
          <p className="mt-2 text-xs text-emerald-300/90" role="status">
            Slot {savedSlot} updated
          </p>
        ) : null}
      </div>

      <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-zinc-800/80">
        {([1, 2, 3] as Slot[]).map((slot) => {
          const current = slotted.get(slot);
          const card = current?.cards;
          const graded =
            current &&
            isGradedEntry(current) &&
            current.grading_company &&
            current.grade != null;

          return (
            <div key={slot} className="flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
                  Slot {slot}
                </p>
                {graded ? (
                  <Badge tone="accent">Graded</Badge>
                ) : current ? (
                  <Badge>Raw</Badge>
                ) : (
                  <Badge>Empty</Badge>
                )}
              </div>

              <div
                className={cn(
                  "flex min-h-[7.5rem] items-center justify-center rounded-[14px] border border-dashed border-zinc-700/80 bg-zinc-950/50 p-3",
                  current && "border-solid border-zinc-700/60",
                )}
              >
                {card && current ? (
                  <div className="flex w-full items-center gap-3">
                    {graded && current.grading_company && current.grade != null ? (
                      <GradedSlab
                        cardName={card.name}
                        cardImageUrl={card.image_url}
                        setName={card.set_name}
                        cardNumber={card.card_number}
                        rarity={card.rarity}
                        gradingCompany={current.grading_company}
                        grade={current.grade}
                        certNumber={current.cert_number}
                        isBlackLabel={current.is_black_label}
                        slabImageUrl={current.slab_image_url}
                        size="sm"
                        interactive={false}
                        className="flex-shrink-0"
                      />
                    ) : (
                      <div className="relative h-28 w-[4.75rem] flex-shrink-0 overflow-hidden rounded-[10px] border border-zinc-700 bg-zinc-950 shadow-lg">
                        {card.image_url ? (
                          <CardImage
                            src={card.image_url}
                            alt={card.name}
                            className="absolute inset-0 h-full w-full object-contain"
                          />
                        ) : null}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium text-white">
                        {card.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
                      </p>
                      {graded && current.grading_company && current.grade != null ? (
                        <p className="mt-1.5 text-[11px] font-semibold text-amber-300/90">
                          {formatGradedBadge(
                            current.grading_company,
                            current.grade,
                            current.is_black_label,
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-500">
                    Pick a card from your collection
                  </p>
                )}
              </div>

              <label className="flex flex-col gap-1.5 text-[11px] text-zinc-400">
                Choose card
                <Select
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
                  className="text-xs"
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
                        {isGradedEntry(row) && row.grading_company && row.grade != null
                          ? ` · ${formatGradedBadge(row.grading_company, row.grade, row.is_black_label)}`
                          : ""}
                        {inOtherSlot ? ` (slot ${row.showcase_slot})` : ""}
                      </option>
                    );
                  })}
                </Select>
              </label>

              {current && (
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => assignSlot(current.id, null)}
                  className="self-start text-[11px] text-zinc-500 underline-offset-2 hover:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:opacity-50"
                >
                  {pending === current.id ? "Removing…" : "Remove from showcase"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="border-t border-zinc-800 px-4 py-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}
