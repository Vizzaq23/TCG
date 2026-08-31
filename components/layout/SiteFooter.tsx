import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/browse", label: "Catalog" },
  { href: "/collection", label: "Collection" },
  { href: "/collection/portfolio", label: "Portfolio" },
  { href: "/social", label: "Collectors" },
  { href: "/compare", label: "Compare" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-800/70 bg-zinc-950/75">
      <PageContainer className="flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md space-y-3">
          <Link
            href="/"
            prefetch={false}
            className="font-display inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <span aria-hidden className="grid size-7 place-items-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-[10px] font-bold text-amber-300">
              OP
            </span>
            One Piece TCG Shelf
          </Link>
          <p className="text-sm leading-relaxed text-zinc-500">
            Catalog, value, and present your collection in one focused collector workspace.
          </p>
        </div>

        <div className="space-y-4 sm:text-right">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end" aria-label="Footer">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className="text-sm text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-zinc-600">Collector tools for the One Piece Card Game.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
