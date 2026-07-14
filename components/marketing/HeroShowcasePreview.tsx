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
        "home-showcase relative overflow-hidden",
        themed ? "home-showcase--deck" : "rounded-[14px] border border-[rgba(255,236,205,0.08)] bg-[#12100e]",
        "min-h-[22rem] sm:min-h-[26rem]",
        className,
      )}
      aria-hidden
    >
      <div className="relative flex h-full flex-col justify-end px-4 pb-7 pt-9 sm:px-8 sm:pb-9">
        <p
          className={cn(
            "mb-5 text-center text-[11px] font-medium tracking-[0.14em]",
            themed ? "text-[#c4a574]/80" : "text-amber-200/70",
          )}
        >
          {themed ? "Treasure showcase" : "Collector's Showcase"}
        </p>

        <div className="relative z-[1] flex items-end justify-center gap-2 sm:gap-3">
          {display.map((card, i) => {
            const lift = i === 1 ? "-translate-y-3 sm:-translate-y-4 scale-[1.08] z-10" : "z-0";
            return (
              <div
                key={`${card.name}-${i}`}
                className={cn("w-[28%] max-w-[8.5rem]", lift)}
              >
                <div
                  className={cn(
                    "rounded-[6px] bg-zinc-950 p-[3px]",
                    themed
                      ? "border border-[#5c4630]/70 shadow-[0_14px_28px_rgba(0,0,0,0.55)]"
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
                    <div className="relative aspect-[5/7] overflow-hidden rounded-[4px] bg-zinc-900">
                      {card.imageUrl ? (
                        <CardImage
                          src={card.imageUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#1a2433] to-zinc-950 p-2 text-center">
                          <span className="text-[9px] font-semibold text-[#c4a574]/80">
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

        {/* Physical shelf */}
        <div className="home-showcase-shelf" aria-hidden>
          <div className="home-showcase-shelf-top" />
          <div className="home-showcase-shelf-face" />
          <div className="home-showcase-shelf-shadow" />
        </div>
      </div>
    </div>
  );
}
