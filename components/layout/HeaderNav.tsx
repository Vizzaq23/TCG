"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/browse", label: "Browse" },
  { href: "/collection", label: "My collection" },
  { href: "/collection/portfolio", label: "Portfolio" },
  { href: "/collection/trades", label: "Trades" },
  { href: "/social", label: "Social" },
  { href: "/compare", label: "Compare" },
];

export function HeaderNav() {
  const pathname = usePathname();

  const navLinks = links.map((link) => {
    const active =
      link.href === "/collection"
        ? pathname === "/collection"
        : pathname === link.href || pathname.startsWith(`${link.href}/`);

    return { ...link, active };
  });

  return (
    <nav className="flex items-center" aria-label="Main">
      <div className="hidden items-center gap-1 lg:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={cn(
              "rounded-lg px-3 py-2 text-[13px] font-medium transition duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
              link.active
                ? "bg-zinc-800/75 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
            )}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <details className="group relative lg:hidden">
        <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-[12px] border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Open navigation</span>
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 grid min-w-56 gap-1 rounded-[16px] border border-zinc-800 bg-zinc-950/98 p-2 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Navigate
          </p>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={cn(
                "rounded-[10px] px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
                link.active ? "bg-amber-500/10 text-amber-200" : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
              )}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
