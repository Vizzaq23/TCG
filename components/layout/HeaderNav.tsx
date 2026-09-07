"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/journey", label: "Journey" },
  { href: "/shop", label: "Shop" },
];

const groups = [
  {
    label: "Collection",
    links: [
      { href: "/collection", label: "My collection", description: "All the cards you call yours" },
      { href: "/collection/portfolio", label: "Portfolio", description: "Keep track of your collection’s value" },
      { href: "/collection/trades", label: "Trades", description: "Find a new home for your doubles" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/social", label: "Collectors", description: "Discover shelves and find your crew" },
      { href: "/compare", label: "Compare shelves", description: "See what you have in common" },
    ],
  },
];

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="shelf-nav-chevron" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function HeaderNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  function closeMenus() {
    navRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
      menu.open = false;
    });
  }

  useEffect(() => {
    closeMenus();
  }, [pathname]);

  useEffect(() => {
    function closeOutsideMenus(event: PointerEvent | FocusEvent) {
      navRef.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach((menu) => {
        if (!menu.contains(event.target as Node)) menu.open = false;
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const menu = navRef.current?.querySelector<HTMLDetailsElement>("details[open]");
      if (!menu) return;
      if (menu.contains(document.activeElement)) menu.querySelector("summary")?.focus();
      menu.open = false;
    }

    window.addEventListener("pointerdown", closeOutsideMenus);
    window.addEventListener("focusin", closeOutsideMenus);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", closeMenus);
    return () => {
      window.removeEventListener("pointerdown", closeOutsideMenus);
      window.removeEventListener("focusin", closeOutsideMenus);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", closeMenus);
    };
  }, []);

  function isActive(href: string) {
    return pathname === href || (href !== "/" && href !== "/collection" && pathname.startsWith(`${href}/`));
  }

  return (
    <nav ref={navRef} className="shelf-nav" aria-label="Main">
      <div className="shelf-nav-desktop">
        {primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch={false}
            className={cn("shelf-nav-link", isActive(link.href) && "shelf-nav-link-active")}
            aria-current={isActive(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
        <span className="shelf-nav-divider" aria-hidden="true" />
        {groups.map((group) => (
          <details key={group.label} name="site-navigation" className="shelf-nav-dropdown">
            <summary className={cn("shelf-nav-link", group.links.some((link) => isActive(link.href)) && "shelf-nav-link-active")}>
              {group.label}<Chevron />
            </summary>
            <div className="shelf-nav-panel">
              <p className="shelf-nav-heading">{group.label}</p>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={false}
                  onClick={closeMenus}
                  className="shelf-nav-panel-link"
                  aria-current={isActive(link.href) ? "page" : undefined}
                >
                  <span>{link.label}<span className="shelf-nav-arrow" aria-hidden="true">↗</span></span>
                  <small>{link.description}</small>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>

      <details name="site-navigation" className="shelf-nav-mobile">
        <summary className="shelf-nav-menu-button" aria-label="Navigation menu">
          <span className="shelf-nav-menu-label">Menu</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path className="shelf-nav-menu-lines" d="M5 8h14M5 16h14" />
            <path className="shelf-nav-menu-cross" d="m6 6 12 12M6 18 18 6" />
          </svg>
        </summary>
        <div className="shelf-nav-mobile-panel">
          <div className="shelf-nav-mobile-intro"><span>Find your next chapter</span><span aria-hidden="true">↗</span></div>
          <div className="shelf-nav-mobile-primary">
            {primaryLinks.map((link) => (
              <Link key={link.href} href={link.href} prefetch={false} onClick={closeMenus} className="shelf-nav-mobile-link" aria-current={isActive(link.href) ? "page" : undefined}>
                {link.label}<span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <div className="shelf-nav-mobile-groups">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="shelf-nav-heading">{group.label}</p>
                {group.links.map((link) => (
                  <Link key={link.href} href={link.href} prefetch={false} onClick={closeMenus} className="shelf-nav-mobile-secondary" aria-current={isActive(link.href) ? "page" : undefined}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </details>
    </nav>
  );
}
