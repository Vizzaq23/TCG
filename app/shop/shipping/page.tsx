import { PageContainer } from "@/components/ui/PageContainer";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <PageContainer as="main" className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Shipping</h1>
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-300">
        <p>
          Orders ship only to addresses in the United States. A flat $4.99 shipping
          charge applies to each order.
        </p>
        <p>
          The carrier, handling time, tracking promise, and packaging commitments
          have not yet been finalized.
        </p>
        <p className="text-amber-200">
          Checkout will remain unavailable until the merchant publishes those final
          shipping details.
        </p>
      </div>
      <ShopFooterLinks />
    </PageContainer>
  );
}
