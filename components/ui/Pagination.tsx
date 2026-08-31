import Link from "next/link";
import { cn } from "@/lib/cn";

type Props = {
  basePath: string;
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
};

function buildHref(
  basePath: string,
  page: number,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

const linkClass = cn(
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-[12px] border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-sm font-medium text-zinc-200 transition",
  "hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
);

const activeClass = cn(
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-[12px] border border-amber-500/50 bg-amber-500/12 px-3 py-1.5 text-sm font-semibold text-amber-200",
);

export function Pagination({
  basePath,
  currentPage,
  totalPages,
  searchParams,
}: Props) {
  if (totalPages <= 1) return null;

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  const pageNumbers: number[] = [];
  const windowSize = 5;
  let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  for (let p = start; p <= end; p++) pageNumbers.push(p);

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-800/70 pt-8"
      aria-label="Pagination"
    >
      {prevPage ? (
        <Link
          href={buildHref(basePath, prevPage, searchParams)}
          className={linkClass}
          aria-label="Previous page"
        >
          ← Prev
        </Link>
      ) : (
        <span className={`${linkClass} pointer-events-none opacity-40`}>← Prev</span>
      )}

      {start > 1 && (
        <>
          <Link href={buildHref(basePath, 1, searchParams)} className={linkClass}>
            1
          </Link>
          {start > 2 && <span className="px-1 text-zinc-500">…</span>}
        </>
      )}

      {pageNumbers.map((p) =>
        p === currentPage ? (
          <span key={p} className={activeClass} aria-current="page">
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(basePath, p, searchParams)}
            className={linkClass}
          >
            {p}
          </Link>
        ),
      )}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-zinc-500">…</span>}
          <Link
            href={buildHref(basePath, totalPages, searchParams)}
            className={linkClass}
          >
            {totalPages}
          </Link>
        </>
      )}

      {nextPage ? (
        <Link
          href={buildHref(basePath, nextPage, searchParams)}
          className={linkClass}
          aria-label="Next page"
        >
          Next →
        </Link>
      ) : (
        <span className={`${linkClass} pointer-events-none opacity-40`}>Next →</span>
      )}
    </nav>
  );
}
