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
    graded: { company: "PSA", grade: 10 },
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
        "relative overflow-hidden rounded-[18px]",
        themed
          ? "border border-amber-500/20 shadow-[0_40px_100px_rgba(0,0,0,0.5),0_0_60px_rgba(14,116,144,0.12)]"
          : "border border-[rgba(255,236,205,0.08)] shadow-[0_40px_100px_rgba(0,0,0,0.45)]",
        themed
          ? "bg-[linear-gradient(180deg,#0c1524_0%,#0a1018_45%,#08090f_100%)]"
          : "bg-[linear-gradient(180deg,#141210_0%,#0c0b0a_45%,#080807_100%)]",
        "min-h-[22rem] sm:min-h-[26rem]",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          themed
            ? "bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.16),transparent_50%),radial-gradient(ellipse_at_80%_90%,rgba(14,116,144,0.15),transparent_45%)]"
            : "bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,248,230,0.12),transparent_55%)]",
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative flex h-full flex-col justify-end px-4 pb-8 pt-10 sm:px-8 sm:pb-10">
        <p
          className={cn(
            "mb-6 text-center text-[10px] font-semibold uppercase tracking-[0.28em]",
            themed ? "text-sky-300/75" : "text-amber-200/70",
          )}
        >
          {themed ? "Treasure Showcase" : "Collector's Showcase"}
        </p>

        <div className="flex items-end justify-center gap-2 sm:gap-4">
          {display.map((card, i) => {
            const lift = i === 1 ? "-translate-y-3 sm:-translate-y-5 scale-110 z-10" : "z-0";
            return (
              <div
                key={`${card.name}-${i}`}
                className={cn(
                  "w-[28%] max-w-[8.5rem] transition-transform duration-500",
                  lift,
                )}
              >
                <div
                  className={cn(
                    "rounded-[12px] bg-zinc-950/80 p-1 shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
                    themed ? "border border-amber-500/20" : "border border-white/10",
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
                    <div className="relative aspect-[5/7] overflow-hidden rounded-[8px] bg-zinc-900">
                      {card.imageUrl ? (
                        <CardImage
                          src={card.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-sky-950 to-zinc-950 p-2 text-center">
                          <span className="text-[9px] font-semibold text-amber-400/80">
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

        <div
          className={cn(
            "mx-auto mt-6 h-2 w-[70%] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.5)]",
            themed
              ? "bg-gradient-to-r from-transparent via-amber-700/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-[#5c3d1e]/80 to-transparent",
          )}
        />
      </div>
    </div>
  );
}
