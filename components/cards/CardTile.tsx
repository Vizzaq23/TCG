import type { Database } from "@/lib/types/database";
import { CardImage } from "@/components/cards/CardImage";

type Card = Database["public"]["Tables"]["cards"]["Row"];

type Props = {
  card: Card;
  footer?: React.ReactNode;
};

export function CardTile({ card, footer }: Props) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[14px] border border-zinc-800 bg-zinc-900/60 shadow-sm shadow-black/20 transition hover:border-zinc-700">
      <div className="relative aspect-[5/7] w-full overflow-hidden bg-zinc-950">
        {card.image_url ? (
          <CardImage
            src={card.image_url}
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {card.name}
        </h2>
        <dl className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
          {card.set_name && (
            <>
              <dt className="text-zinc-500">Set</dt>
              <dd className="truncate text-right text-zinc-300">{card.set_name}</dd>
            </>
          )}
          {card.card_number && (
            <>
              <dt className="text-zinc-500">#</dt>
              <dd className="truncate text-right font-mono text-zinc-300">
                {card.card_number}
              </dd>
            </>
          )}
          {card.rarity && (
            <>
              <dt className="text-zinc-500">Rarity</dt>
              <dd className="truncate text-right text-zinc-300">{card.rarity}</dd>
            </>
          )}
          {card.color && (
            <>
              <dt className="text-zinc-500">Color</dt>
              <dd className="truncate text-right text-zinc-300">{card.color}</dd>
            </>
          )}
          {card.type && (
            <>
              <dt className="text-zinc-500">Type</dt>
              <dd className="truncate text-right text-zinc-300">{card.type}</dd>
            </>
          )}
        </dl>
        {footer && <div className="mt-2 border-t border-zinc-800 pt-2">{footer}</div>}
      </div>
    </article>
  );
}
