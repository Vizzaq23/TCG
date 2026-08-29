import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { formatUsdCents } from "@/lib/money";
import { isShopOwner } from "@/lib/shop/config";

export const metadata = { title: "Sales reports" };

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/shop/reports");
  if (!isShopOwner(user.id)) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="text-sm text-amber-100">Shop owner only.</p>
      </PageContainer>
    );
  }

  const { data: rows } = await supabase
    .from("sales_ledger")
    .select(
      "sold_at, title, quantity, revenue_cents, cogs_cents, shipping_destination_state, order_id, shop_orders ( order_number )",
    )
    .order("sold_at", { ascending: false })
    .limit(2000);

  const ledger = rows ?? [];
  const revenue = ledger.reduce((s, r) => s + r.revenue_cents, 0);
  const cogs = ledger.reduce((s, r) => s + r.cogs_cents, 0);

  const csv = [
    [
      "sold_at",
      "order_number",
      "title",
      "quantity",
      "revenue_cents",
      "cogs_cents",
      "margin_cents",
      "destination_state",
    ].join(","),
    ...ledger.map((r) => {
      const order = r.shop_orders as { order_number: string } | null;
      return [
        csvEscape(r.sold_at),
        csvEscape(order?.order_number),
        csvEscape(r.title),
        csvEscape(r.quantity),
        csvEscape(r.revenue_cents),
        csvEscape(r.cogs_cents),
        csvEscape(r.revenue_cents - r.cogs_cents),
        csvEscape(r.shipping_destination_state),
      ].join(",");
    }),
  ].join("\n");

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          title="Sales history"
          description="Ledger of paid sales for tax packets and future distributor applications. Inventory only decreases after Stripe confirms payment."
        />
        <div className="flex gap-2">
          <Button href={csvHref} size="sm" variant="secondary">
            Download CSV
          </Button>
          <Button href="/shop/orders" size="sm" variant="ghost">
            Orders
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500">Gross merchandise</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatUsdCents(revenue)}
          </p>
        </div>
        <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500">Recorded COGS</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatUsdCents(cogs)}
          </p>
        </div>
        <div className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500">Gross margin</p>
          <p className="mt-1 text-xl font-semibold text-amber-300">
            {formatUsdCents(revenue - cogs)}
          </p>
        </div>
      </div>

      {!ledger.length ? (
        <p className="text-sm text-zinc-500">No paid sales yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Revenue</th>
                <th className="px-3 py-2">COGS</th>
                <th className="px-3 py-2">State</th>
              </tr>
            </thead>
            <tbody>
              {ledger.slice(0, 100).map((r, idx) => {
                const order = r.shop_orders as { order_number: string } | null;
                return (
                  <tr key={`${r.order_id}-${idx}`} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-zinc-400">
                      {new Date(r.sold_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {order?.order_number ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-white">{r.title}</td>
                    <td className="px-3 py-2 text-zinc-300">{r.quantity}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {formatUsdCents(r.revenue_cents)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {formatUsdCents(r.cogs_cents)}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {r.shipping_destination_state ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
