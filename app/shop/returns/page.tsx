import { PageContainer } from "@/components/ui/PageContainer";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";

export const metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <PageContainer as="main" className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Returns</h1>
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-300">
        <p>
          The store&apos;s return window, eligibility rules, cancellation process, and
          refund timing have not yet been finalized.
        </p>
        <p className="text-amber-200">
          Checkout will remain unavailable until the merchant publishes this policy.
        </p>
      </div>
      <ShopFooterLinks />
    </PageContainer>
  );
}
