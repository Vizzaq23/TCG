import Link from "next/link";
import { cn } from "@/lib/cn";

export type ShelfFilter = "all" | "trade" | "notes";

type Props = {
  username: string;
  filter: ShelfFilter;
  totalCount: number;
  filteredCount: number;
  notesCount: number;
  tradeCount: number;
};

export function PublicShelfToolbar({
  username,
  filter,
  totalCount,
  filteredCount,
  notesCount,
  tradeCount,
}: Props) {
  const base = `/u/${encodeURIComponent(username)}`;
  const tabClass =
    "rounded-[10px] px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";

  const suffix =
    filter === "trade"
      ? " for trade"
      : filter === "notes"
        ? " with notes"
        : " on shelf";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1 rounded-[12px] border border-zinc-800 bg-zinc-900/60 p-1">
        <Link
          href={base}
          className={cn(
            tabClass,
            filter === "all"
              ? "bg-amber-500/20 text-amber-200"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-current={filter === "all" ? "page" : undefined}
        >
          All cards
          <span className="ml-1 text-zinc-500">{totalCount}</span>
        </Link>
        <Link
          href={`${base}?trade=1`}
          className={cn(
            tabClass,
            filter === "trade"
              ? "bg-amber-500/20 text-amber-200"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-current={filter === "trade" ? "page" : undefined}
        >
          For trade
          <span className="ml-1 text-zinc-500">{tradeCount}</span>
        </Link>
        <Link
          href={`${base}?notes=1`}
          className={cn(
            tabClass,
            filter === "notes"
              ? "bg-amber-500/20 text-amber-200"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-current={filter === "notes" ? "page" : undefined}
        >
          With notes
          <span className="ml-1 text-zinc-500">{notesCount}</span>
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        {filteredCount} of {totalCount} entr{totalCount === 1 ? "y" : "ies"}
        {suffix}
      </p>
    </div>
  );
}
