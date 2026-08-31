import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { cn } from "@/lib/cn";

export type HeroPreviewCard = {
  name: string;
  imageUrl: string | null;
  setName: string | null;
  cardNumber: string | null;
  rarity: string | null;
  graded?: {
    company: "PSA" | "BGS" | "CGC" | "SGC";
    grade: number;
    isBlackLabel?: boolean;
  };
};

const FALLBACK: HeroPreviewCard[] = [
  {
    name: "Monkey D. Luffy",
    imageUrl: null,
    setName: "Romance Dawn",
    cardNumber: "OP01-001",
    rarity: "Leader",
  },
  {
    name: "Roronoa Zoro",
    imageUrl: null,
    setName: "Romance Dawn",
    cardNumber: "OP01-025",
    rarity: "Super Rare",
  },
  {
    name: "Nami",
    imageUrl: null,
    setName: "Romance Dawn",
    cardNumber: "OP01-016",
    rarity: "Rare",
  },
];

type Props = {
  cards?: HeroPreviewCard[];
  className?: string;
  themed?: boolean;
};

export function HeroShowcasePreview({ cards = FALLBACK, className, themed }: Props) {
  const display = cards.length >= 3 ? cards.slice(0, 3) : [...cards, ...FALLBACK].slice(0, 3);

  return (
    <div
      className={cn(
        "home-showcase surface-card relative overflow-hidden rounded-[24px]",
        themed ? "home-showcase--vault" : "bg-zinc-900",
        "min-h-[23rem] sm:min-h-[29rem]",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/75">Collector showcase</p>
          <p className="mt-1 text-xs text-zinc-500">Selected from the catalog</p>
        </div>
        <span className="rounded-full border border-zinc-700/80 bg-zinc-950/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          Top 3
        </span>
      </div>

      <div className="relative flex min-h-[23rem] flex-col justify-end px-4 pb-9 pt-24 sm:min-h-[29rem] sm:px-8 sm:pb-12">

        <div className="relative z-[1] flex items-end justify-center gap-2 sm:gap-3">
          {display.map((card, i) => {
            const lift = i === 1 ? "-translate-y-4 sm:-translate-y-6 scale-[1.08] z-10" : "z-0";
            return (
              <div
                key={`${card.name}-${i}`}
                className={cn("w-[29%] max-w-[9.5rem] transition duration-300 hover:-translate-y-2", lift)}
              >
                <div
                  className={cn(
                    "rounded-[10px] bg-zinc-950 p-[3px]",
                    themed
                      ? "border border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.58)]"
                      : "border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
                  )}
                >
                  {card.graded ? (
                    <GradedSlab
                      cardName={card.name}
                      cardImageUrl={card.imageUrl}
                      setName={card.setName}
                      cardNumber={card.cardNumber}
                      rarity={card.rarity}
                      gradingCompany={card.graded.company}
                      grade={card.graded.grade}
                      isBlackLabel={card.graded.isBlackLabel}
                      size="xs"
                      interactive={false}
                    />
                  ) : (
                    <div className="relative aspect-[5/7] overflow-hidden rounded-[7px] bg-zinc-900">
                      {card.imageUrl ? (
                        <CardImage
                          src={card.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#1a2433] to-zinc-950 p-2 text-center">
                          <span className="text-[9px] font-semibold text-amber-300/80">
                            {card.rarity ?? "Card"}
                          </span>
                          <span className="line-clamp-3 text-[10px] font-medium text-zinc-200">
                            {card.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-3 h-px w-4/5 bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" aria-hidden />
      </div>
    </div>
  );
}
