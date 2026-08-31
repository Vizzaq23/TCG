import { PageContainer } from "@/components/ui/PageContainer";
import { getPublicShopSettings } from "@/lib/shop/owner";
import { ShopFooterLinks } from "@/components/shop/ShopFooterLinks";

export const metadata = { title: "Contact" };

export default async function ContactPage() {
  const settings = await getPublicShopSettings();
  const email = settings?.support_email;

  return (
    <PageContainer as="main" className="space-y-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Contact</h1>
      <div className="max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-300">
        <p>
          Questions about an order, listing condition, or wholesale/business inquiries:
        </p>
        {email ? (
          <p>
            Email{" "}
            <a
              href={`mailto:${email}`}
              className="text-amber-400 underline underline-offset-2"
            >
              {email}
            </a>
          </p>
        ) : (
          <p className="text-zinc-500">
            A customer-support contact has not yet been published. Checkout will remain
            unavailable until it is configured.
          </p>
        )}
        <p>Include your order number whenever possible.</p>
      </div>
      <ShopFooterLinks />
    </PageContainer>
  );
}
