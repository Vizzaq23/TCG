import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatUsdCents } from "@/lib/money";
import { isShopOwner } from "@/lib/shop/config";
import { OrderActions } from "@/components/shop/OrderActions";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/shop/orders");
  if (!isShopOwner(user.id)) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="text-sm text-amber-100">Shop owner only.</p>
      </PageContainer>
    );
  }

  const { data: orders } = await supabase
    .from("shop_orders")
    .select(
      "id, order_number, status, buyer_email, total_cents, shipping_cents, subtotal_cents, shipping_name, shipping_address, tracking_number, paid_at, created_at, shop_order_items ( id, title, quantity, unit_price_cents, kind )",
    )
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          title="Orders"
          description="Paid orders update inventory via Stripe webhooks. Mark packed/shipped here."
        />
        <div className="flex gap-2">
          <Button href="/shop/sell" size="sm" variant="secondary">
            Sell desk
          </Button>
          <Button href="/shop/reports" size="sm" variant="ghost">
            Reports
          </Button>
        </div>
      </div>

      {!orders?.length ? (
        <p className="text-sm text-zinc-500">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const items = (order.shop_order_items ?? []) as Array<{
              id: string;
              title: string;
              quantity: number;
              unit_price_cents: number;
              kind: string;
            }>;
            const addr = order.shipping_address as {
              line1?: string;
              line2?: string;
              city?: string;
              state?: string;
              postal_code?: string;
              country?: string;
            } | null;
            return (
              <li
                key={order.id}
                className="space-y-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">
                        {order.order_number}
                      </p>
                      <Badge
                        tone={
                          order.status === "paid" || order.status === "shipped"
                            ? "success"
                            : "accent"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">
                      {order.buyer_email} · {formatUsdCents(order.total_cents)}
                      {order.paid_at
                        ? ` · paid ${new Date(order.paid_at).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1 text-sm text-zinc-300">
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.title} —{" "}
                      {formatUsdCents(item.unit_price_cents * item.quantity)}
                    </li>
                  ))}
                </ul>
                {addr ? (
                  <p className="text-xs text-zinc-500">
                    Ship to {order.shipping_name ?? "customer"}
                    <br />
                    {[addr.line1, addr.line2, addr.city, addr.state, addr.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : null}
                {["paid", "packed", "shipped"].includes(order.status) ? (
                  <OrderActions
                    orderId={order.id}
                    status={order.status}
                    trackingNumber={order.tracking_number}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
}
