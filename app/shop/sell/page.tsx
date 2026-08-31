import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatUsdCents } from "@/lib/money";
import { isShopOwner } from "@/lib/shop/config";
import { ensureShopSettings } from "@/lib/shop/owner";
import { kindLabel } from "@/lib/shop/kinds";
import { BulkLotForm } from "@/components/shop/BulkLotForm";
import { ListingStatusButtons } from "@/components/shop/ListingStatusButtons";
import { ShopSettingsForm } from "@/components/shop/ShopSettingsForm";

export const metadata = { title: "Sell desk" };

export default async function SellDeskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/shop/sell");
  if (!isShopOwner(user.id)) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          This sell desk is limited to the configured shop owner
          (SHOP_OWNER_USER_ID).
        </p>
      </PageContainer>
    );
  }

  const settings = await ensureShopSettings(user.id);
  const { data: listings } = await supabase
    .from("shop_listings")
    .select(
      "id, title, kind, status, quantity_available, price_cents, unit_cost_cents, condition, updated_at",
    )
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <PageContainer as="main" className="space-y-8 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          as="h1"
          title="Sell desk"
          description={`${settings.store_name} · ${
            settings.shipping_cents == null
              ? "Shipping is not configured"
              : `Flat shipping ${formatUsdCents(settings.shipping_cents)}`
          }. List singles from your collection, or create bulk lots here.`}
        />
        <div className="flex flex-wrap gap-2">
          <Button href="/collection" size="sm" variant="secondary">
            Collection → list
          </Button>
          <Button href="/shop/orders" size="sm" variant="ghost">
            Orders
          </Button>
          <Button href="/shop/reports" size="sm" variant="ghost">
            Reports
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ShopSettingsForm
          storeName={settings.store_name}
          supportEmail={settings.support_email}
          shippingCents={settings.shipping_cents}
        />
        <BulkLotForm />
      </div>

      <section className="space-y-4">
        <SectionHeader
          title="Your listings"
          description="Active, draft, and archived inventory."
        />
        {!listings?.length ? (
          <p className="text-sm text-zinc-500">No listings yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-[14px] border border-zinc-800">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{kindLabel(listing.kind)}</Badge>
                    <Badge
                      tone={listing.status === "active" ? "success" : "accent"}
                    >
                      {listing.status}
                    </Badge>
                  </div>
                  <Link
                    href={`/shop/${listing.id}`}
                    className="font-medium text-white hover:text-amber-300"
                  >
                    {listing.title}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {listing.quantity_available} available ·{" "}
                    {formatUsdCents(listing.price_cents)}
                    {listing.unit_cost_cents != null
                      ? ` · cost ${formatUsdCents(listing.unit_cost_cents)}`
                      : ""}
                  </p>
                </div>
                <ListingStatusButtons
                  listingId={listing.id}
                  status={listing.status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
