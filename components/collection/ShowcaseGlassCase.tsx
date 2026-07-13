"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "framer-motion";
import { CardFoil } from "@/components/cards/CardFoil";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { getFoilTier } from "@/lib/foil";
import type { PublicShowcaseRow } from "@/lib/types/database";
import { formatGradedBadge, isGradedEntry } from "@/lib/types/grading";

type Props = {
  cards: PublicShowcaseRow[];
};

type DisplayCard = PublicShowcaseRow & { slot: number };

function rarityLabel(rarity: string | null): string | null {
  if (!rarity) return null;
  const t = rarity.trim();
  return t || null;
}

function SleevedCard({
  card,
  hovered,
  foilX,
  foilY,
  reduceMotion,
}: {
  card: DisplayCard;
  hovered: boolean;
  foilX: MotionValue<number>;
  foilY: MotionValue<number>;
  reduceMotion: boolean;
}) {
  const tier = getFoilTier(card.rarity, card.card_name);

  return (
    <div className="cs-sleeved relative w-full">
      <div
        className={[
          "cs-sleeve relative overflow-hidden rounded-[14px] p-[5px]",
          hovered ? "cs-sleeve--lifted" : "",
        ].join(" ")}
      >
        <div className="relative aspect-[5/7] overflow-hidden rounded-[9px] bg-zinc-950">
          {card.image_url ? (
            <CardImage
              src={card.image_url}
              alt={card.card_name}
              className="absolute inset-0 h-full w-full object-contain"
              loading="eager"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">
              No image
            </div>
          )}
          <CardFoil
            tier={tier}
            foilX={foilX}
            foilY={foilY}
            hovered={hovered}
            reduceMotion={reduceMotion}
          />
          <div
            className={[
              "cs-sleeve-sheen pointer-events-none absolute inset-0",
              hovered ? "opacity-55" : "opacity-30",
            ].join(" ")}
            aria-hidden
          />
        </div>
        <div className="cs-sleeve-rim pointer-events-none absolute inset-0 rounded-[14px]" aria-hidden />
      </div>
      <div
        className={[
          "cs-contact-shadow pointer-events-none absolute inset-x-[12%] -bottom-1 h-3 rounded-full transition-opacity duration-500",
          hovered ? "opacity-80" : "opacity-45",
        ].join(" ")}
        aria-hidden
      />
    </div>
  );
}

function ShowcaseItem({
  card,
  featured,
  angle,
  reduceMotion,
}: {
  card: DisplayCard;
  featured: boolean;
  angle: number;
  reduceMotion: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), {
    stiffness: 160,
    damping: 22,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), {
    stiffness: 160,
    damping: 22,
  });
  const foilX = useTransform(x, [-0.5, 0.5], [8, 92]);
  const foilY = useTransform(y, [-0.5, 0.5], [12, 88]);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduceMotion || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [reduceMotion, x, y],
  );

  const onLeave = useCallback(() => {
    setHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  const rarity = rarityLabel(card.rarity);
  const graded = isGradedEntry(card);

  return (
    <div
      className={[
        "cs-item group relative flex flex-col items-center",
        featured ? "z-20 w-[36%] max-w-[15.5rem]" : "z-10 w-[31%] max-w-[13.5rem]",
        "hover:z-30",
      ].join(" ")}
    >
      <motion.div
        ref={ref}
        className="relative w-full origin-bottom"
        style={{
          rotate: angle,
          ...(reduceMotion || !hovered
            ? {}
            : {
                rotateX,
                rotateY,
                transformPerspective: 1100,
                transformStyle: "preserve-3d" as const,
              }),
        }}
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        whileHover={
          reduceMotion
            ? undefined
            : {
                y: -14,
                scale: 1.2,
                transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              }
        }
        onMouseEnter={() => setHovered(true)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div
          className={[
            "cs-spotlight pointer-events-none absolute -inset-10 -z-10 transition-opacity duration-500",
            hovered ? "opacity-100" : "opacity-55",
          ].join(" ")}
          aria-hidden
        />
        <div
          className={[
            "cs-warm-glow pointer-events-none absolute -inset-6 -z-10 transition-opacity duration-500",
            hovered ? "opacity-90" : "opacity-50",
          ].join(" ")}
          aria-hidden
        />

        {graded && card.grading_company && card.grade != null ? (
          <GradedSlab
            cardName={card.card_name}
            cardImageUrl={card.image_url}
            setName={card.set_name}
            cardNumber={card.card_number}
            rarity={card.rarity}
            gradingCompany={card.grading_company}
            grade={card.grade}
            certNumber={card.cert_number}
            isBlackLabel={card.is_black_label}
            slabImageUrl={card.slab_image_url}
            size={featured ? "xl" : "lg"}
            className="!w-full"
            interactive={false}
            showReflection={false}
            loading="eager"
            foilX={foilX}
            foilY={foilY}
            foilHovered={hovered}
          />
        ) : (
          <SleevedCard
            card={card}
            hovered={hovered}
            foilX={foilX}
            foilY={foilY}
            reduceMotion={reduceMotion}
          />
        )}

        <div className="cs-floor-reflection pointer-events-none mt-2 h-12 overflow-hidden" aria-hidden>
          <div className="origin-top scale-y-[-1] opacity-30 blur-[0.3px]">
            {graded && card.grading_company && card.grade != null ? (
              <div className="mx-auto h-full w-[88%] rounded-[8px] bg-gradient-to-b from-white/20 to-transparent" />
            ) : card.image_url ? (
              <CardImage
                src={card.image_url}
                alt=""
                className="h-full w-full object-contain opacity-40"
                loading="lazy"
                sharpen={false}
              />
            ) : null}
          </div>
        </div>
      </motion.div>

      <div className="cs-caption relative z-10 mt-5 w-full px-1 text-center">
        <p className="line-clamp-1 text-[13px] font-medium tracking-tight text-zinc-100/95">
          {card.card_name}
        </p>
        {card.set_name ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] tracking-wide text-zinc-500">
            {card.set_name}
          </p>
        ) : null}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          {graded && card.grading_company && card.grade != null ? (
            <span className="cs-badge cs-badge-grade">
              {formatGradedBadge(card.grading_company, card.grade, card.is_black_label)}
            </span>
          ) : null}
          {rarity ? <span className="cs-badge">{rarity}</span> : null}
        </div>
      </div>
    </div>
  );
}

function MobileCarousel({
  items,
  reduceMotion,
}: {
  items: DisplayCard[];
  reduceMotion: boolean;
}) {
  const [index, setIndex] = useState(() => {
    const center = items.findIndex((c) => c.slot === 2);
    return center >= 0 ? center : 0;
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && index < items.length - 1) setIndex((i) => i + 1);
    else if (info.offset.x > 60 && index > 0) setIndex((i) => i - 1);
  };

  return (
    <div className="relative w-full">
      <div className="overflow-hidden px-1">
        <motion.div
          className="flex w-full items-center"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
          animate={{ x: `${-index * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          {items.map((card, i) => (
            <div
              key={card.collection_id}
              className="flex w-full shrink-0 basis-full justify-center px-8"
            >
              <div className="w-[78%] max-w-[16rem]">
                <ShowcaseItem
                  card={card}
                  featured={i === index}
                  angle={0}
                  reduceMotion={reduceMotion}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div
        className="mt-8 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Collector's Showcase"
      >
        {items.map((card, i) => (
          <button
            key={card.collection_id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${card.card_name}`}
            onClick={() => setIndex(i)}
            className={[
              "h-1 rounded-full transition-all duration-500",
              i === index ? "w-7 bg-amber-200/80" : "w-1.5 bg-white/20 hover:bg-white/35",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function WalnutStand() {
  return (
    <div className="cs-stand relative z-0 mx-auto mt-2 w-[96%] max-w-[52rem]" aria-hidden>
      <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden>
        <defs>
          <filter id="walnut-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.04 0.9"
              numOctaves="4"
              seed="7"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0.28 0 0 0 0 0.14 0 0 0 0 0.06 0 0 0 0.55 0"
            />
          </filter>
          <filter id="walnut-pores" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.7"
              numOctaves="2"
              seed="3"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.15 0 0 0 0 0.08 0 0 0 0 0.03 0 0 0 0.35 0"
            />
          </filter>
        </defs>
      </svg>

      <div className="cs-stand-contact absolute -top-2 left-[8%] right-[8%] h-4" />

      <div className="cs-stand-deck relative mx-auto">
        <div className="cs-stand-deck-top relative h-[11px] overflow-hidden rounded-t-[4px] sm:h-[13px]">
          <div className="cs-wood cs-wood--top absolute inset-0" />
          <div className="cs-wood-svg absolute inset-0 opacity-70" style={{ filter: "url(#walnut-noise)" }} />
          <div className="cs-wood-svg absolute inset-0 opacity-40" style={{ filter: "url(#walnut-pores)" }} />
          <div className="cs-stand-polish absolute inset-0" />
          <div className="cs-stand-deck-highlight absolute inset-x-0 top-0 h-1/2" />
        </div>
        <div className="cs-stand-lip relative h-[14px] overflow-hidden sm:h-[16px]">
          <div className="cs-wood cs-wood--edge absolute inset-0" />
          <div className="cs-wood-svg absolute inset-0 opacity-55" style={{ filter: "url(#walnut-noise)" }} />
          <div className="cs-stand-lip-shade absolute inset-0" />
          <div className="cs-stand-lip-catch absolute inset-x-[6%] top-0 h-px" />
        </div>
      </div>

      <div className="cs-stand-underhang mx-auto h-[6px] w-[99.5%]" />

      <div className="cs-stand-column relative mx-auto h-10 w-[74%] overflow-hidden sm:h-11">
        <div className="cs-wood cs-wood--column absolute inset-0" />
        <div className="cs-wood-svg absolute inset-0 opacity-60" style={{ filter: "url(#walnut-noise)" }} />
        <div className="cs-stand-column-sides absolute inset-0" />
        <div className="cs-stand-column-recess absolute inset-x-[18%] inset-y-[12%] rounded-sm" />
      </div>

      <div className="cs-stand-base relative mx-auto mt-1.5 h-[15px] w-[58%] overflow-hidden rounded-[3px] sm:h-[17px]">
        <div className="cs-wood cs-wood--base absolute inset-0" />
        <div className="cs-wood-svg absolute inset-0 opacity-50" style={{ filter: "url(#walnut-noise)" }} />
        <div className="cs-stand-base-bevel absolute inset-x-0 top-0 h-[40%]" />
        <div className="cs-stand-base-floor absolute inset-x-0 bottom-0 h-[35%]" />
      </div>

      <div className="cs-stand-floor-shadow mx-auto mt-2 h-6 w-[64%]" />
    </div>
  );
}

/**
 * Premium profile hero — Collector's Showcase.
 * Renders raw sleeved cards and graded slabs on a walnut display stand.
 */
export function ShowcaseGlassCase({ cards }: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [isMobile, setIsMobile] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const smoothX = useSpring(parallaxX, { stiffness: 70, damping: 22 });
  const smoothY = useSpring(parallaxY, { stiffness: 70, damping: 22 });

  const items = useMemo<DisplayCard[]>(() => {
    const bySlot = new Map(cards.map((c) => [c.showcase_slot, c]));
    return [1, 2, 3]
      .map((slot) => {
        const card = bySlot.get(slot);
        return card ? { ...card, slot } : null;
      })
      .filter((c): c is DisplayCard => c !== null);
  }, [cards]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!items.length) return null;

  const left = items.find((c) => c.slot === 1);
  const center = items.find((c) => c.slot === 2) ?? items[Math.floor(items.length / 2)];
  const right = items.find((c) => c.slot === 3);
  const desktopOrder = [left, center, right].filter(Boolean) as DisplayCard[];

  return (
    <section
      aria-label="Collector's Showcase"
      className="cs-hero relative mx-auto w-full max-w-6xl"
    >
      <div className="cs-hero-shell relative overflow-visible rounded-[24px] px-4 pb-12 pt-14 sm:px-10 sm:pb-16 sm:pt-16 lg:px-14 lg:pb-20 lg:pt-20">
        <div className="cs-ambient pointer-events-none absolute inset-0" aria-hidden />
        <div className="cs-vignette pointer-events-none absolute inset-0" aria-hidden />
        <div className="cs-ceiling-light pointer-events-none absolute inset-x-0 top-0 h-40" aria-hidden />

        <header className="relative z-10 mb-12 text-center sm:mb-16">
          <p className="text-[10px] font-medium uppercase tracking-[0.38em] text-zinc-500">
            Prized collectibles
          </p>
          <h2 className="mt-3 text-[1.65rem] font-semibold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
            Collector&apos;s Showcase
          </h2>
        </header>

        <div
          ref={stageRef}
          className="relative z-10 min-h-[22rem] sm:min-h-[26rem]"
          onMouseMove={(e) => {
            if (reduceMotion || !stageRef.current) return;
            const rect = stageRef.current.getBoundingClientRect();
            parallaxX.set(((e.clientX - rect.left) / rect.width - 0.5) * 8);
            parallaxY.set(((e.clientY - rect.top) / rect.height - 0.5) * 5);
          }}
          onMouseLeave={() => {
            parallaxX.set(0);
            parallaxY.set(0);
          }}
        >
          {isMobile ? (
            <div className="flex min-h-[22rem] items-center">
              <MobileCarousel items={items} reduceMotion={reduceMotion} />
            </div>
          ) : (
            <motion.div
              className="relative mx-auto flex min-h-[26rem] w-[88%] max-w-4xl items-center justify-center gap-10 lg:gap-14"
              style={
                reduceMotion
                  ? undefined
                  : { x: smoothX, y: smoothY, transformStyle: "preserve-3d" }
              }
            >
              {desktopOrder.map((card) => {
                const featured = card.slot === center.slot;
                const angle = card.slot === 1 ? 4 : card.slot === 3 ? -4 : 0;
                return (
                  <ShowcaseItem
                    key={card.collection_id}
                    card={card}
                    featured={featured}
                    angle={angle}
                    reduceMotion={reduceMotion}
                  />
                );
              })}
            </motion.div>
          )}
        </div>

        <WalnutStand />
      </div>
    </section>
  );
}
