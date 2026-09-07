import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";

const links = [
  { href: "/", label: "Home" },
  { href: "/journey", label: "Journey" },
  { href: "/shop", label: "Shop" },
  { href: "/browse", label: "Catalog" },
  { href: "/collection", label: "Collection" },
  { href: "/collection/portfolio", label: "Portfolio" },
  { href: "/social", label: "Collectors" },
  { href: "/compare", label: "Compare" },
];

export function SiteFooter() {
  return (
    <footer className="manga-site-footer border-t-2 border-zinc-700 bg-zinc-950">
      <PageContainer className="flex flex-col gap-8 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md space-y-3">
          <Link
            href="/"
            prefetch={false}
            className="manga-brand inline-flex items-center gap-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <span aria-hidden className="manga-brand-mark">
              <span>OP<span className="manga-brand-mark-dot">.</span></span>
            </span>
            <span className="manga-brand-title">ONE PIECE TCG SHELF</span>
          </Link>
          <p className="text-sm leading-relaxed text-zinc-500">
            The cards are yours. The adventure is endless.
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
          <p className="text-xs text-zinc-500">An independent fan project. ONE PIECE © Eiichiro Oda / Shueisha, Toei Animation. Card game © Bandai.</p>
        </div>
      </PageContainer>
    </footer>
  );
}
