import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import {
  TradeOffersInbox,
  type TradeOfferListItem,
} from "@/components/trades/TradeOffersInbox";

export default async function TradesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase to use trade offers.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection/trades");
  }

  const { data: offers, error } = await supabase
    .from("trade_offers")
    .select("*")
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const list: TradeOfferListItem[] = [];

  if (offers?.length) {
    const userIds = [...new Set(offers.flatMap((o) => [o.from_user_id, o.to_user_id]))];
    const collectionIds = [...new Set(offers.map((o) => o.target_collection_id))];

    const [{ data: profiles }, { data: collections }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name").in("id", userIds),
      supabase
        .from("user_collections")
        .select("id, cards ( name, set_name, card_number )")
        .in("id", collectionIds),
    ]);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const collectionMap = new Map((collections ?? []).map((c) => [c.id, c]));

    for (const offer of offers) {
      const incoming = offer.to_user_id === user.id;
      const counterpartId = incoming ? offer.from_user_id : offer.to_user_id;
      const counterpart = profileMap.get(counterpartId);
      const col = collectionMap.get(offer.target_collection_id);
      const card = col?.cards as
        | { name: string; set_name: string | null; card_number: string | null }
        | null
        | undefined;

      list.push({
        id: offer.id,
        status: offer.status,
        message: offer.message,
        created_at: offer.created_at,
        direction: incoming ? "incoming" : "outgoing",
        counterpartUsername: counterpart?.username ?? "unknown",
        counterpartDisplayName: counterpart?.display_name ?? null,
        cardName: card?.name ?? "Card",
        cardSet: card?.set_name ?? null,
        cardNumber: card?.card_number ?? null,
      });
    }
  }

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-8 sm:py-10">
      <SectionHeader
        as="h1"
        title="Trade offers"
        description="Request, accept, or decline offers on cards marked for trade."
        actions={
          <>
            <Button href="/collection" size="sm" variant="secondary">
              Back to collection
            </Button>
            <Button href="/browse" size="sm" variant="ghost">
              Browse catalog
            </Button>
          </>
        }
      />
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}. Apply the portfolio/trades migration if you have not yet.
        </p>
      ) : (
        <TradeOffersInbox offers={list} />
      )}
    </PageContainer>
  );
}
