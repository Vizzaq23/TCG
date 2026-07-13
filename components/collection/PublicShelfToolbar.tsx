import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  username: string;
  tradeOnly: boolean;
  totalCount: number;
  filteredCount: number;
};

export function PublicShelfToolbar({
  username,
  tradeOnly,
  totalCount,
  filteredCount,
}: Props) {
  const base = `/u/${encodeURIComponent(username)}`;
  const tabClass =
    "rounded-[10px] px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 rounded-[12px] border border-zinc-800 bg-zinc-900/60 p-1">
        <Link
          href={base}
          className={cn(
            tabClass,
            !tradeOnly
              ? "bg-amber-500/20 text-amber-200"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-current={!tradeOnly ? "page" : undefined}
        >
          All cards
        </Link>
        <Link
          href={`${base}?trade=1`}
          className={cn(
            tabClass,
            tradeOnly
              ? "bg-amber-500/20 text-amber-200"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
          )}
          aria-current={tradeOnly ? "page" : undefined}
        >
          For trade
        </Link>
      </div>
      <p className="text-sm text-zinc-500">
        {filteredCount} of {totalCount} entr{totalCount === 1 ? "y" : "ies"}
        {tradeOnly ? " for trade" : " on shelf"}
      </p>
    </div>
  );
}
