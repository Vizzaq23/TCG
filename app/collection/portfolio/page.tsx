import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { CollectionStatsRow } from "@/lib/types/database";
import { buildHoldings, type PortfolioSnapshot } from "@/lib/portfolio";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { PortfolioSummary } from "@/components/collection/PortfolioSummary";
import { PortfolioHistory } from "@/components/collection/PortfolioHistory";
import { PortfolioHoldings } from "@/components/collection/PortfolioHoldings";

export default async function PortfolioPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer as="main" className="py-10">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Configure Supabase to view your portfolio.
        </p>
      </PageContainer>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection/portfolio");
  }

  const { data: statsRows, error: statsError } =
    await supabase.rpc("get_collection_stats");
  const stats = (statsRows as CollectionStatsRow[] | null)?.[0] ?? null;

  const { data: rows, error: rowsError } = await supabase
    .from("user_collections")
    .select(
      "id, quantity, estimated_value_cents, is_for_trade, is_graded, cards ( name, set_name, card_number, image_url )",
    )
    .eq("user_id", user.id);

  const { data: snapshots } = await supabase
    .from("collection_value_snapshots")
    .select("id, total_value_cents, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(60);

  const { valued, unpriced } = buildHoldings(rows ?? []);
  const topLineCents = valued[0]?.lineCents ?? 0;

  return (
    <PageContainer as="main" className="flex flex-col gap-10 py-8 sm:py-10">
      <SectionHeader
        as="h1"
        title="Portfolio"
        description="Estimated collection value, history, and top holdings."
        actions={
          <>
            <Button href="/collection" size="sm" variant="secondary">
              Edit values
            </Button>
            <Button href="/collection/trades" size="sm" variant="ghost">
              Trades
            </Button>
          </>
        }
      />

      {statsError ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          Stats unavailable: {statsError.message}. Apply the portfolio migration if you have not
          yet.
        </p>
      ) : stats ? (
        <PortfolioSummary
          stats={stats}
          valuedCount={valued.length}
          unpricedCount={unpriced.length}
          topLineCents={topLineCents}
        />
      ) : null}

      {rowsError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {rowsError.message}
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">Value chart</h2>
            <PortfolioHistory snapshots={(snapshots ?? []) as PortfolioSnapshot[]} />
          </section>
          <PortfolioHoldings valued={valued} unpriced={unpriced} />
        </>
      )}
    </PageContainer>
  );
}
