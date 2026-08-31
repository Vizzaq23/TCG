import Link from "next/link";
import type { PublicCollectionRow } from "@/lib/types/database";
import { formatGradedBadge, isGradedEntry } from "@/lib/types/grading";
import { shelfCardPath } from "@/lib/shelf-links";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MarketPrice } from "@/components/prices/MarketPrice";

type Props = {
  username: string;
  treasure: PublicCollectionRow;
  marketPriceCents: number | null;
  accentColor: string;
  dayLabel: string;
};

export function DailyTreasurePull({
  username,
  treasure,
  marketPriceCents,
  accentColor,
  dayLabel,
}: Props) {
  const graded = isGradedEntry(treasure);
  const href = shelfCardPath(username, treasure.card_id, {
    trade: treasure.is_for_trade,
  });

  return (
    <aside
      className="daily-treasure surface-card overflow-hidden rounded-[22px]"
      style={{
        backgroundImage: `radial-gradient(ellipse 80% 70% at 0% 0%, ${accentColor}22, transparent 55%), linear-gradient(180deg, rgba(24,24,27,0.9), rgba(9,9,11,0.95))`,
      }}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
        <div className="relative mx-auto w-[7.5rem] flex-shrink-0 sm:mx-0 sm:w-36">
          <div
            className="pointer-events-none absolute -inset-3 rounded-full opacity-40 blur-2xl motion-reduce:opacity-20"
            style={{ background: accentColor }}
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[14px] border border-zinc-700/80 bg-zinc-950 shadow-lg shadow-black/40">
            {graded && treasure.grading_company && treasure.grade != null ? (
              <div className="flex justify-center px-2 py-3">
                <GradedSlab
                  cardName={treasure.card_name}
                  cardImageUrl={treasure.image_url}
                  setName={treasure.set_name}
                  cardNumber={treasure.card_number}
                  rarity={treasure.rarity}
                  gradingCompany={treasure.grading_company}
                  grade={treasure.grade}
                  certNumber={treasure.cert_number}
                  isBlackLabel={treasure.is_black_label}
                  slabImageUrl={treasure.slab_image_url}
                  size="sm"
                  interactive={false}
                />
              </div>
            ) : (
              <div className="aspect-[5/7] bg-zinc-950">
                {treasure.image_url ? (
                  <CardImage
                    src={treasure.image_url}
                    alt={treasure.card_name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                    No art
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: accentColor }}
            >
              Daily treasure · {dayLabel}
            </p>
            <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
              {treasure.card_name}
            </h2>
            <p className="text-sm text-zinc-400">
              {[treasure.set_name, treasure.card_number, treasure.rarity]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {treasure.quantity > 1 ? <Badge>×{treasure.quantity}</Badge> : null}
            {graded && treasure.grading_company && treasure.grade != null ? (
              <Badge tone="accent">
                {formatGradedBadge(
                  treasure.grading_company,
                  treasure.grade,
                  treasure.is_black_label,
                )}
              </Badge>
            ) : treasure.condition ? (
              <Badge>{treasure.condition}</Badge>
            ) : null}
            {treasure.is_for_trade ? (
              <Badge tone="success">For trade</Badge>
            ) : null}
          </div>

          {treasure.notes?.trim() ? (
            <p className="line-clamp-2 text-sm italic leading-snug text-zinc-400">
              “{treasure.notes.trim()}”
            </p>
          ) : (
            <p className="text-sm text-zinc-500">
              Pulled from @{username}&apos;s shelf for today&apos;s voyage.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <MarketPrice
              cents={marketPriceCents}
              size="sm"
              label={graded ? "Underlying raw market" : "Market"}
              unavailable={marketPriceCents == null}
            />
            <Button href={href} size="sm" variant="secondary">
              View on shelf
            </Button>
            <Link
              href={href}
              className="text-xs text-zinc-500 underline-offset-2 hover:text-amber-200 hover:underline"
            >
              Jump to card
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
