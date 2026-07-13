"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/browse", label: "Browse" },
  { href: "/collection", label: "My collection" },
  { href: "/collection/portfolio", label: "Portfolio" },
  { href: "/collection/trades", label: "Trades" },
  { href: "/compare", label: "Compare" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Main">
      {links.map((link) => {
        const active =
          link.href === "/collection"
            ? pathname === "/collection"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-2.5 py-2 text-sm font-medium transition sm:px-3",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
              active
                ? "bg-zinc-800/90 text-white"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
