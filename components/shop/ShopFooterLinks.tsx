import Link from "next/link";

export function ShopFooterLinks() {
  return (
    <nav
      aria-label="Shop policies"
      className="flex flex-wrap gap-x-2 text-xs text-zinc-500"
    >
      <Link
        href="/shop/shipping"
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300"
      >
        Shipping
      </Link>
      <Link
        href="/shop/returns"
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300"
      >
        Returns
      </Link>
      <Link
        href="/shop/contact"
        prefetch={false}
        className="inline-flex min-h-10 items-center px-2 hover:text-zinc-300"
      >
        Contact
      </Link>
    </nav>
  );
}
