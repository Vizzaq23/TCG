import Link from "next/link";
import { CardImage } from "@/components/cards/CardImage";
import { Badge } from "@/components/ui/Badge";
import { formatUsdCents } from "@/lib/money";
import type { PortfolioHolding } from "@/lib/portfolio";

type Props = {
  valued: PortfolioHolding[];
  unpriced: PortfolioHolding[];
};

export function PortfolioHoldings({ valued, unpriced }: Props) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold text-white">Top holdings</h2>
        {!valued.length ? (
          <p className="empty-state px-4 py-8 text-center text-sm">
            No priced cards yet. Open{" "}
            <Link href="/collection" className="text-amber-400 underline-offset-2 hover:underline">
              My collection
            </Link>{" "}
            and set an estimated value on each card.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {valued.map((h, index) => (
              <li
                key={h.id}
                className="surface-card flex items-center gap-3 rounded-[16px] px-3 py-3 transition hover:border-zinc-700 sm:gap-4 sm:px-4"
              >
                <span className="w-6 flex-shrink-0 text-center text-xs tabular-nums text-zinc-500">
                  {index + 1}
                </span>
                <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
                  {h.imageUrl ? (
                    <CardImage
                      src={h.imageUrl}
                      className="absolute inset-0 h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] text-zinc-600">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{h.cardName}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {[h.setName, h.cardNumber].filter(Boolean).join(" · ")}
                    {h.quantity > 1 ? ` · ×${h.quantity}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {h.isGraded ? <Badge tone="accent">Graded</Badge> : null}
                    {h.isForTrade ? <Badge tone="success">For trade</Badge> : null}
                    {h.priceSource === "market" ? <Badge>JustTCG</Badge> : null}
                    {h.priceSource === "manual" ? <Badge tone="accent">Manual</Badge> : null}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-white">
                    {formatUsdCents(h.lineCents)}
                  </p>
                  <p className="text-[11px] tabular-nums text-zinc-500">
                    {formatUsdCents(h.unitCents)}
                    {h.quantity > 1 ? " ea" : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {unpriced.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold text-white">
            Unpriced ({unpriced.length})
          </h2>
          <p className="text-sm text-zinc-500">
            These cards are not in your portfolio total. Add estimates from the collection page.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {unpriced.slice(0, 24).map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-[12px] border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-2"
              >
                <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950">
                  {h.imageUrl ? (
                    <CardImage
                      src={h.imageUrl}
                      className="absolute inset-0 h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{h.cardName}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {[h.setName, h.cardNumber].filter(Boolean).join(" · ")}
                    {h.quantity > 1 ? ` · ×${h.quantity}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {unpriced.length > 24 ? (
            <p className="text-xs text-zinc-600">Showing 24 of {unpriced.length}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
