"use client";

import { useState } from "react";
import { CollectionRow, type CollectionRowData } from "./CollectionRow";
import { ShowcasePicker } from "./ShowcasePicker";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";

type Props = {
  rows: CollectionRowData[];
  error: string | null;
  canListForSale?: boolean;
};

export function CollectionInventory({ rows, error, canListForSale = false }: Props) {
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  // Keep confirmed removals hidden even if an older route refresh arrives later.
  const visibleRows = rows.filter((row) => !removedIds.has(row.id));

  function onRemoved(id: string) {
    setRemovedIds((previous) => new Set(previous).add(id));
  }

  return (
    <>
      {visibleRows.length > 0 && <ShowcasePicker rows={visibleRows} />}

      <section className="space-y-4">
        <SectionHeader
          title="Your cards"
          description="Edit quantities, conditions, grades, estimated value, and trade status."
        />
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </p>
        ) : visibleRows.length === 0 ? (
          <div className="empty-state px-6 py-14 text-center">
            <p className="text-sm text-zinc-400">
              You have not added any cards yet. Head to the catalog to start your shelf.
            </p>
            <div className="mt-5">
              <Button href="/browse">Browse cards</Button>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {visibleRows.map((row) => (
              <CollectionRow
                key={row.id}
                row={row}
                canListForSale={canListForSale}
                onRemoved={onRemoved}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
