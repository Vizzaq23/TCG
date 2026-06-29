type SetProgressItem = {
  setName: string;
  owned: number;
  total: number;
};

type Props = { items: SetProgressItem[] };

export function SetProgress({ items }: Props) {
  if (!items.length) return null;

  const sorted = [...items].sort((a, b) => {
    const aPct = a.total > 0 ? a.owned / a.total : 0;
    const bPct = b.total > 0 ? b.owned / b.total : 0;
    if (bPct !== aPct) return bPct - aPct;
    return a.setName.localeCompare(b.setName);
  });

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Set progress</h2>
        <p className="text-xs text-zinc-500">
          Unique cards you own vs. cards in each set.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {sorted.map((item) => {
          const pct =
            item.total > 0 ? Math.round((item.owned / item.total) * 100) : 0;
          const complete = item.owned >= item.total && item.total > 0;

          return (
            <li
              key={item.setName}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
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
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    complete ? "bg-amber-400" : "bg-amber-500/70"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">{pct}% complete</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
