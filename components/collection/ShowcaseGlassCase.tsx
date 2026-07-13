import { CardImage } from "@/components/cards/CardImage";
import type { PublicShowcaseRow } from "@/lib/types/database";

type Props = {
  cards: PublicShowcaseRow[];
  title?: string;
};

function ShowcaseSlot({
  card,
  slot,
}: {
  card: PublicShowcaseRow | null;
  slot: number;
}) {
  return (
    <div className="group relative flex flex-1 flex-col items-center">
      <div className="relative w-full max-w-[11rem] sm:max-w-[12rem]">
        {/* Pedestal */}
        <div className="absolute -bottom-3 left-1/2 h-3 w-[85%] -translate-x-1/2 rounded-[100%] bg-black/50 blur-md" />

        {/* Glass case */}
        <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-white/10 via-white/5 to-white/[0.02] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
          {/* Glass shine */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-60" />
          <div className="pointer-events-none absolute -left-1/4 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Inner frame */}
          <div className="relative aspect-[5/7] overflow-hidden rounded-xl border border-amber-500/20 bg-zinc-950/80 shadow-inner">
            {card?.image_url ? (
              <CardImage
                src={card.image_url}
                alt={card.card_name}
                className="absolute inset-0 h-full w-full object-contain p-1 transition duration-500 group-hover:scale-[1.03]"
                loading="eager"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                <span className="text-2xl text-zinc-700">◇</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-600">
                  Slot {slot}
                </span>
              </div>
            )}
          </div>

          {/* Bottom label strip */}
          <div className="relative mt-2 min-h-[2.75rem] px-1 text-center">
            {card ? (
              <>
                <p className="line-clamp-1 text-xs font-semibold text-white">
                  {card.card_name}
                </p>
                <p className="line-clamp-1 text-[10px] text-zinc-400">
                  {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-zinc-500">Empty showcase slot</p>
            )}
          </div>
        </div>

        {/* Slot number badge */}
        <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/20 text-[10px] font-bold text-amber-200 shadow-lg">
          {slot}
        </span>
      </div>
    </div>
  );
}

export function ShowcaseGlassCase({ cards, title = "Top 3 showcase" }: Props) {
  const bySlot = new Map(cards.map((c) => [c.showcase_slot, c]));
  const slots = [1, 2, 3].map((slot) => bySlot.get(slot) ?? null);
  const hasAny = cards.length > 0;

  if (!hasAny) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-700/80 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 p-5 shadow-2xl sm:p-8">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-2/3 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <header className="relative mb-6 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-500/90">
          Collector&apos;s showcase
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white sm:text-xl">{title}</h2>
      </header>

      <div className="relative flex flex-col items-stretch justify-center gap-6 sm:flex-row sm:gap-4">
        {slots.map((card, i) => (
          <ShowcaseSlot key={i + 1} card={card} slot={i + 1} />
        ))}
      </div>
    </section>
  );
}
