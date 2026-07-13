"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type PanInfo,
} from "framer-motion";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { formatGradedBadge, type GradedSlabData } from "@/lib/types/grading";

export type SlabShowcaseItem = GradedSlabData & {
  id: string;
  /** 1 | 2 | 3 — center featured slot is 2 */
  slot: number;
};

type Props = {
  slabs: SlabShowcaseItem[];
  title?: string;
  subtitle?: string;
  className?: string;
};

function rarityLabel(rarity: string | null | undefined): string | null {
  if (!rarity) return null;
  const t = rarity.trim();
  return t || null;
}

function SlabStageItem({
  item,
  featured,
  angle,
  reduceMotion,
}: {
  item: SlabShowcaseItem;
  featured: boolean;
  angle: number;
  reduceMotion: boolean;
}) {
  const rarity = rarityLabel(item.rarity);

  return (
    <div
      className={[
        "slab-showcase-item group relative flex flex-col items-center",
        featured ? "z-20 w-[42%] max-w-[14rem]" : "z-10 w-[30%] max-w-[10.75rem]",
        "hover:z-30",
      ].join(" ")}
    >
      <motion.div
        className="relative w-full origin-bottom"
        style={{ rotate: angle }}
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="slab-showcase-spotlight pointer-events-none absolute -inset-8 -z-10" aria-hidden />
        <div
          className="slab-showcase-glow pointer-events-none absolute -inset-5 -z-10 opacity-60 transition duration-300 group-hover:opacity-100"
          aria-hidden
        />

        <GradedSlab
          {...item}
          size={featured ? "xl" : "lg"}
          className="!w-full"
          interactive
          showReflection
          loading="eager"
        />
      </motion.div>

      <div className="slab-showcase-plate mt-3 w-full rounded-2xl px-3 py-2.5 text-center">
        <p className="line-clamp-1 text-[13px] font-medium tracking-tight text-zinc-50">
          {item.cardName}
        </p>
        {item.setName ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{item.setName}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-200 ring-1 ring-amber-400/25">
            {formatGradedBadge(item.gradingCompany, item.grade, item.isBlackLabel)}
          </span>
          {item.certNumber ? (
            <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-zinc-300 ring-1 ring-white/10">
              #{item.certNumber}
            </span>
          ) : null}
          {rarity ? (
            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-300 ring-1 ring-white/10">
              {rarity}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MobileCarousel({
  items,
  reduceMotion,
}: {
  items: SlabShowcaseItem[];
  reduceMotion: boolean;
}) {
  const [index, setIndex] = useState(() => {
    const center = items.findIndex((s) => s.slot === 2);
    return center >= 0 ? center : 0;
  });

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 && index < items.length - 1) setIndex((i) => i + 1);
    else if (info.offset.x > 60 && index > 0) setIndex((i) => i - 1);
  };

  return (
    <div className="relative w-full">
      <div className="overflow-hidden px-2">
        <motion.div
          className="flex w-full items-end"
          drag={reduceMotion ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={onDragEnd}
          animate={{ x: `${-index * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
        >
          {items.map((item, i) => (
            <div key={item.id} className="flex w-full shrink-0 basis-full justify-center px-6">
              <div className="w-[78%] max-w-[15rem]">
                <SlabStageItem
                  item={item}
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
        className="mt-5 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Featured slabs"
      >
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${item.cardName}`}
            onClick={() => setIndex(i)}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-6 bg-amber-400/90" : "w-1.5 bg-white/25 hover:bg-white/40",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Museum-quality display for up to three featured graded slabs.
 * Center slab is larger; side slabs angle inward. Reusable on profiles,
 * collection pages, marketplace, etc.
 */
export function SlabShowcase({
  slabs,
  title = "Collector's Showcase",
  subtitle = "Prized collectibles",
  className = "",
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const [isMobile, setIsMobile] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  const smoothX = useSpring(parallaxX, { stiffness: 80, damping: 20 });
  const smoothY = useSpring(parallaxY, { stiffness: 80, damping: 20 });

  const items = useMemo(() => {
    const bySlot = new Map(slabs.map((s) => [s.slot, s]));
    return [1, 2, 3]
      .map((slot) => bySlot.get(slot) ?? null)
      .filter((s): s is SlabShowcaseItem => s !== null);
  }, [slabs]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!items.length) return null;

  const left = items.find((s) => s.slot === 1);
  const center = items.find((s) => s.slot === 2) ?? items[Math.floor(items.length / 2)];
  const right = items.find((s) => s.slot === 3);
  const desktopOrder = [left, center, right].filter(Boolean) as SlabShowcaseItem[];

  return (
    <section
      aria-label={title}
      className={["slab-showcase relative mx-auto w-full max-w-5xl py-6 sm:py-10", className].join(
        " ",
      )}
    >
      <div className="slab-showcase-shell relative overflow-hidden rounded-[20px] px-4 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="slab-showcase-ambient pointer-events-none absolute inset-0" aria-hidden />
        <div className="slab-showcase-vignette pointer-events-none absolute inset-0" aria-hidden />
        <div className="slab-showcase-dust pointer-events-none absolute inset-0" aria-hidden />

        <header className="relative z-10 mb-8 text-center sm:mb-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-zinc-400">
            {subtitle}
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            {title}
          </h2>
        </header>

        <div
          ref={stageRef}
          className="relative z-10"
          onMouseMove={(e) => {
            if (reduceMotion || !stageRef.current) return;
            const rect = stageRef.current.getBoundingClientRect();
            parallaxX.set(((e.clientX - rect.left) / rect.width - 0.5) * 12);
            parallaxY.set(((e.clientY - rect.top) / rect.height - 0.5) * 8);
          }}
          onMouseLeave={() => {
            parallaxX.set(0);
            parallaxY.set(0);
          }}
        >
          {isMobile ? (
            <MobileCarousel items={items} reduceMotion={reduceMotion} />
          ) : (
            <motion.div
              className="relative mx-auto flex w-[82%] max-w-3xl items-end justify-center gap-6 lg:gap-10"
              style={
                reduceMotion
                  ? undefined
                  : { x: smoothX, y: smoothY, transformStyle: "preserve-3d" }
              }
            >
              {desktopOrder.map((item) => {
                const featured = item.slot === center.slot;
                const angle = item.slot === 1 ? 7 : item.slot === 3 ? -7 : 0;
                return (
                  <SlabStageItem
                    key={item.id}
                    item={item}
                    featured={featured}
                    angle={angle}
                    reduceMotion={reduceMotion}
                  />
                );
              })}
            </motion.div>
          )}
        </div>

        <div className="relative z-0 mx-auto mt-1 w-[88%] max-w-3xl">
          <div className="slab-showcase-glass-shelf mx-auto h-3 w-full rounded-full" />
          <div className="slab-showcase-pedestal mx-auto mt-2 h-5 w-[72%] rounded-md sm:h-6" />
          <div className="slab-showcase-pedestal-base mx-auto mt-1 h-2 w-[58%] rounded-sm" />
        </div>
      </div>
    </section>
  );
}
