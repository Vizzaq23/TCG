import Link from "next/link";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import { formatUsdCents } from "@/lib/money";
import { getStripe } from "@/lib/shop/stripe";
import { isStripeConfigured } from "@/lib/shop/config";
import { isCheckoutPaymentConfirmed } from "@/lib/shop/checkout";

export const metadata = { title: "Order status" };

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  let orderNumber: string | null = null;
  let total: number | null = null;
  let email: string | null = null;
  let paymentConfirmed = false;

  if (sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      paymentConfirmed = isCheckoutPaymentConfirmed(session.payment_status);
      if (paymentConfirmed) {
        const orderId = session.metadata?.order_id || session.client_reference_id;
        email = session.customer_details?.email || session.customer_email || null;
        const admin = tryCreateAdminClient();
        if (admin && orderId) {
          const { data: order } = await admin
            .from("shop_orders")
            .select("order_number, total_cents, status")
            .eq("id", orderId)
            .maybeSingle();
          orderNumber = order?.order_number ?? session.metadata?.order_number ?? null;
          total = order?.total_cents ?? (session.amount_total ?? null);
        } else {
          orderNumber = session.metadata?.order_number ?? null;
          total = session.amount_total ?? null;
        }
      }
    } catch {
      // Soft-fail success page
    }
  }

  return (
    <PageContainer as="main" className="py-16">
      <div className="mx-auto max-w-lg space-y-4 rounded-[16px] border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">
          {paymentConfirmed ? "Thank you" : "Order not confirmed"}
        </h1>
        <p className="text-sm text-zinc-400">
          {paymentConfirmed ? (
            <>
              Payment received. Inventory updates when Stripe confirms the charge via
              webhook
              {orderNumber ? (
                <>
                  . Your order number is{" "}
                  <span className="font-medium text-white">{orderNumber}</span>
                </>
              ) : (
                "."
              )}
            </>
          ) : sessionId ? (
            "We could not verify a completed payment for this Checkout session."
          ) : (
            "A valid Stripe Checkout session is required to confirm an order."
          )}
        </p>
        {paymentConfirmed && total != null ? (
          <p className="text-lg text-amber-300">{formatUsdCents(total)}</p>
        ) : null}
        {paymentConfirmed && email ? (
          <p className="text-xs text-zinc-500">Receipt sent to {email} by Stripe.</p>
        ) : null}
        <div className="flex justify-center gap-2 pt-2">
          <Button href="/shop">Continue shopping</Button>
          <Button href="/shop/shipping" variant="secondary">
            Shipping info
          </Button>
        </div>
        <p className="text-xs text-zinc-600">
          Questions? See{" "}
          <Link href="/shop/contact" className="text-amber-400 underline">
            contact
          </Link>
          .
        </p>
      </div>
    </PageContainer>
  );
}
