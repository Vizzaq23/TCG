import Link from "next/link";

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
  const linkClass =
    "rounded-lg px-3 py-1.5 text-sm font-medium transition";
  const activeClass = "bg-amber-500/20 text-amber-200";
  const inactiveClass = "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
        <Link
          href={base}
          className={`${linkClass} ${!tradeOnly ? activeClass : inactiveClass}`}
          aria-current={!tradeOnly ? "page" : undefined}
        >
          All cards
        </Link>
        <Link
          href={`${base}?trade=1`}
          className={`${linkClass} ${tradeOnly ? activeClass : inactiveClass}`}
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
