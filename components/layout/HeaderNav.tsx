"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const links = [
  { href: "/journey", label: "Journey" },
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
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  function closeMobileMenu() {
    if (mobileMenuRef.current) {
      mobileMenuRef.current.open = false;
    }
  }

  useEffect(() => {
    closeMobileMenu();
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        closeMobileMenu();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMobileMenu();
      }
    }

    function onFocusIn(event: FocusEvent) {
      if (!mobileMenuRef.current?.contains(event.target as Node)) {
        closeMobileMenu();
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const navLinks = links.map((link) => {
    const active =
      link.href === "/collection"
        ? pathname === "/collection"
        : pathname === link.href || pathname.startsWith(`${link.href}/`);

    return { ...link, active };
  });

  return (
    <nav className="flex items-center" aria-label="Main">
      <div className="hidden items-center gap-0.5 xl:flex">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={cn(
              "manga-nav-link px-2.5 py-2 text-[13px] font-medium transition duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
              link.active
                ? "manga-nav-link-active text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
            )}
            aria-current={link.active ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <details ref={mobileMenuRef} className="group relative xl:hidden">
        <summary className="flex size-10 cursor-pointer list-none items-center justify-center border-2 border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:border-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Open navigation</span>
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </summary>
        <div className="absolute right-0 top-[calc(100%+0.65rem)] z-50 grid min-w-56 gap-1 border-2 border-zinc-600 bg-zinc-950 p-2 shadow-[5px_5px_0_#d92d32]">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
            Navigate
          </p>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              onClick={closeMobileMenu}
              className={cn(
                "px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
                link.active ? "bg-[#d92d32] text-white" : "text-zinc-300 hover:bg-zinc-900 hover:text-white",
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
