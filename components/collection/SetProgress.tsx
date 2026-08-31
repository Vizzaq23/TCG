"use client";

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { cn } from "@/lib/cn";

type SetProgressItem = {
  setName: string;
  owned: number;
  total: number;
};

type Props = { items: SetProgressItem[] };

export function SetProgress({ items }: Props) {
  const [showZero, setShowZero] = useState(false);

  const { sorted, zeroCount } = useMemo(() => {
    const sortedItems = [...items].sort((a, b) => {
      const aHas = a.owned > 0 ? 1 : 0;
      const bHas = b.owned > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      const aPct = a.total > 0 ? a.owned / a.total : 0;
      const bPct = b.total > 0 ? b.owned / b.total : 0;
      if (bPct !== aPct) return bPct - aPct;
      return a.setName.localeCompare(b.setName);
    });
    return {
      sorted: sortedItems,
      zeroCount: sortedItems.filter((i) => i.owned === 0).length,
    };
  }, [items]);

  if (!items.length) return null;

  const visible = showZero ? sorted : sorted.filter((i) => i.owned > 0);
  const list = visible.length ? visible : sorted.filter((i) => i.owned > 0);

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Set progress"
        description="Unique cards you own vs. cards in each set."
        actions={
          zeroCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowZero((v) => !v)}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              {showZero ? "Hide untouched sets" : `Show ${zeroCount} untouched`}
            </button>
          ) : undefined
        }
      />
      <ul className="grid gap-2 sm:grid-cols-2">
        {(list.length ? list : sorted).map((item) => {
          const pct =
            item.total > 0 ? Math.round((item.owned / item.total) * 100) : 0;
          const complete = item.owned >= item.total && item.total > 0;

          return (
            <li
              key={item.setName}
              className={cn(
                "rounded-[16px] border px-4 py-3.5 transition hover:border-zinc-700",
                complete
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-zinc-800 bg-zinc-900/55",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-zinc-100">{item.setName}</p>
                <p className="shrink-0 text-xs tabular-nums text-zinc-400">
                  {item.owned}/{item.total}
                  {complete && (
                    <span className="ml-1.5 text-amber-400" aria-label="Complete">
                      ✓
                    </span>
                  )}
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800/90">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    complete ? "bg-amber-400" : "bg-amber-500/80",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">{pct}% complete</p>
            </li>
          );
        })}
      </ul>
      {!showZero && zeroCount > 0 && list.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No sets with progress yet.{" "}
          <button
            type="button"
            className="text-amber-400 hover:underline"
            onClick={() => setShowZero(true)}
          >
            Show all sets
          </button>
        </p>
      ) : null}
    </section>
  );
}
