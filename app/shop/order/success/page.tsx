import Link from "next/link";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import { formatUsdCents } from "@/lib/money";
import { getStripe } from "@/lib/shop/stripe";
import { isStripeConfigured } from "@/lib/shop/config";
import { isCheckoutPaymentConfirmed } from "@/lib/shop/checkout";
import { CheckoutCompletion } from "@/components/shop/CheckoutCompletion";

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
      const stripePaymentConfirmed = isCheckoutPaymentConfirmed(
        session.payment_status,
      );
      if (stripePaymentConfirmed) {
        const orderId = session.metadata?.order_id || session.client_reference_id;
        const admin = tryCreateAdminClient();
        if (admin && orderId) {
          const { data: order } = await admin
            .from("shop_orders")
            .select("order_number, stripe_checkout_session_id")
            .eq("id", orderId)
            .maybeSingle();
          if (order?.stripe_checkout_session_id === session.id) {
            paymentConfirmed = true;
            orderNumber = order.order_number;
            total = session.amount_total ?? null;
            email =
              session.customer_details?.email || session.customer_email || null;
          }
        }
      }
    } catch {
      // Soft-fail success page
    }
  }

  return (
    <PageContainer as="main" className="py-16">
      <div className="mx-auto max-w-lg space-y-4 rounded-[16px] border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        {paymentConfirmed && sessionId ? (
          <CheckoutCompletion sessionId={sessionId} />
        ) : null}
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
          <p className="text-xs text-zinc-500">Payment email: {email}</p>
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
