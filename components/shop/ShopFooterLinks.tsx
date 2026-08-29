import Link from "next/link";

export function ShopFooterLinks() {
  return (
    <nav
      aria-label="Shop policies"
      className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500"
    >
      <Link href="/shop/shipping" className="hover:text-zinc-300">
        Shipping
      </Link>
      <Link href="/shop/returns" className="hover:text-zinc-300">
        Returns
      </Link>
      <Link href="/shop/contact" className="hover:text-zinc-300">
        Contact
      </Link>
    </nav>
  );
}
