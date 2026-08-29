import { PageContainer } from "@/components/ui/PageContainer";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";

export const metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <PageContainer as="main" className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Returns</h1>
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-300">
        <p>
          If your order arrives damaged or incorrect, contact us within 7 days of
          delivery with photos and your order number. We will refund or replace eligible
          items.
        </p>
        <p>
          Opened sealed product and buyer&apos;s-remorse returns on singletons are not
          accepted unless required by law. Condition notes on listings are part of the
          sale.
        </p>
        <p>
          Approved refunds are issued to the original payment method via Stripe.
        </p>
      </div>
      <ShopFooterLinks />
    </PageContainer>
  );
}
