import Link from "next/link";
import type { Database } from "@/lib/types/database";
import { CardImage } from "@/components/cards/CardImage";
import { MarketPrice } from "@/components/prices/MarketPrice";
import { displayCardNumber } from "@/lib/catalog-links";

type Card = Database["public"]["Tables"]["cards"]["Row"];

type Props = {
  card: Card;
  footer?: React.ReactNode;
};

export function CardTile({ card, footer }: Props) {
  return (
    <article className="group surface-card flex h-full flex-col overflow-hidden rounded-[20px] transition duration-200 hover:-translate-y-1 hover:border-zinc-700/90 hover:shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
      <Link
        href={`/browse/${card.id}`}
        className="relative m-2 mb-0 aspect-[5/7] overflow-hidden rounded-[14px] border border-white/[0.04] bg-[radial-gradient(circle_at_50%_18%,rgba(116,129,150,0.13),transparent_45%),#07090d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        {card.image_url ? (
          <CardImage
            src={card.image_url}
            alt={card.name}
            className="absolute inset-0 h-full w-full object-contain transition duration-300 ease-out group-hover:scale-[1.025]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-zinc-950/35 to-transparent" />
        {card.rarity ? (
          <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-zinc-950/75 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-200 shadow-lg backdrop-blur-md">
            {card.rarity}
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/browse/${card.id}`}
          className="font-display line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white transition hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
        >
          {card.name}
        </Link>
        <p className="mt-1.5 line-clamp-1 text-[11px] text-zinc-500">
          {[card.set_name, displayCardNumber(card.card_number)].filter(Boolean).join(" · ") || "Catalog card"}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.color ? (
            <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[9px] font-medium uppercase tracking-wide text-zinc-400">
              {card.color}
            </span>
          ) : null}
          {card.type ? (
            <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[9px] font-medium uppercase tracking-wide text-zinc-400">
              {card.type}
            </span>
          ) : null}
        </div>
        <div className="mt-auto border-t border-zinc-800/80 pt-3">
          <MarketPrice
            cents={card.market_price_cents}
            size="sm"
            unavailable={card.market_price_cents == null}
          />
        </div>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </article>
  );
}
