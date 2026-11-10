import Link from "next/link";

export function ShopFooterLinks({ current }: { current?: "shipping" | "returns" | "contact" } = {}) {
  return (
    <nav
      aria-label="Shop policies"
      className="flex flex-wrap gap-x-2 text-xs text-zinc-500"
    >
      <Link
        href="/shop/shipping"
        aria-current={current === "shipping" ? "page" : undefined}
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300 aria-[current=page]:text-amber-300 aria-[current=page]:underline aria-[current=page]:underline-offset-4"
      >
        Shipping
      </Link>
      <Link
        href="/shop/returns"
        aria-current={current === "returns" ? "page" : undefined}
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300 aria-[current=page]:text-amber-300 aria-[current=page]:underline aria-[current=page]:underline-offset-4"
      >
        Returns
      </Link>
      <Link
        href="/shop/contact"
        aria-current={current === "contact" ? "page" : undefined}
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300 aria-[current=page]:text-amber-300 aria-[current=page]:underline aria-[current=page]:underline-offset-4"
      >
        Contact
      </Link>
    </nav>
  );
}
