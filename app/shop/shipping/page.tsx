import { PageContainer } from "@/components/ui/PageContainer";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <PageContainer as="main" className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Shipping</h1>
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-300">
        <p>
          We currently ship within the United States. A flat shipping rate is added at
          checkout (shown in your cart before you pay).
        </p>
        <p>
          Orders are packed after payment clears. You will receive tracking when the
          order is marked shipped. Typical handling is 1–3 business days unless otherwise
          noted on a listing.
        </p>
        <p>
          Cards are sleeved and packed to prevent bending. Bulk lots ship in sealed bags
          or boxes depending on size.
        </p>
      </div>
      <ShopFooterLinks />
    </PageContainer>
  );
}
