import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { TradeOfferContextRow } from "@/lib/types/database";
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

  const { data: rows, error } = await supabase.rpc("get_my_trade_offers", {
    p_limit: 50,
  });

  const list: TradeOfferListItem[] = ((rows ?? []) as TradeOfferContextRow[]).map(
    (row) => ({
      id: row.id,
      status: row.status,
      message: row.message,
      created_at: row.created_at,
      direction: row.direction === "incoming" ? "incoming" : "outgoing",
      counterpartUsername: row.counterpart_username,
      counterpartDisplayName: row.counterpart_display_name,
      ownerUsername: row.owner_username,
      cardId: row.card_id,
      cardName: row.card_name,
      cardSet: row.set_name,
      cardNumber: row.card_number,
      imageUrl: row.image_url,
      quantity: row.quantity,
      condition: row.condition,
      notes: row.notes,
      isGraded: row.is_graded,
      gradingCompany: row.grading_company,
      grade: row.grade == null ? null : Number(row.grade),
      isBlackLabel: row.is_black_label,
    }),
  );

  return (
    <PageContainer as="main" className="flex flex-col gap-8 py-10 sm:py-14">
      <div className="space-y-3">
      <p className="eyebrow">Trade desk</p>
      <SectionHeader
        as="h1"
        title="Trade offers"
        description="Request, accept, or decline offers on cards marked for trade — with full card context."
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
      </div>
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error.message}. Apply the trade offer context migration if you have not yet.
        </p>
      ) : (
        <TradeOffersInbox offers={list} />
      )}
    </PageContainer>
  );
}
