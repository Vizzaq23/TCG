"use client";

import { useCallback, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { CardImage } from "@/components/cards/CardImage";
import { CardFoil } from "@/components/cards/CardFoil";
import { getFoilTier } from "@/lib/foil";
import {
  formatGrade,
  gradeLabel,
  type GradedSlabData,
  type GradingCompany,
} from "@/lib/types/grading";

export type GradedSlabSize = "xs" | "sm" | "md" | "lg" | "xl";

type Props = GradedSlabData & {
  size?: GradedSlabSize;
  className?: string;
  interactive?: boolean;
  showReflection?: boolean;
  loading?: "lazy" | "eager";
  /** External pointer 0–100 for foil when parent drives hover (e.g. showcase) */
  foilX?: MotionValue<number>;
  foilY?: MotionValue<number>;
  foilHovered?: boolean;
};

const SIZE_WIDTH: Record<GradedSlabSize, string> = {
  xs: "w-[4.5rem]",
  sm: "w-[6.5rem]",
  md: "w-[9.5rem]",
  lg: "w-[12.5rem]",
  xl: "w-[15.5rem]",
};

function companyTheme(company: string, isBlackLabel = false): string {
  const key = company.toUpperCase() as GradingCompany;
  if (key === "BGS" && isBlackLabel) return "graded-slab--bgs-black";
  switch (key) {
    case "PSA":
      return "graded-slab--psa";
    case "BGS":
      return "graded-slab--bgs";
    case "CGC":
      return "graded-slab--cgc";
    case "SGC":
      return "graded-slab--sgc";
    default:
      return "graded-slab--psa";
  }
}

function SlabLabel({
  company,
  grade,
  cardName,
  setName,
  cardNumber,
  certNumber,
  isBlackLabel,
}: {
  company: string;
  grade: number | string;
  cardName: string;
  setName?: string | null;
  cardNumber?: string | null;
  certNumber?: string | null;
  isBlackLabel?: boolean;
}) {
  const gradeText = formatGrade(grade);
  const qualifier = gradeLabel(company, grade, isBlackLabel);

  return (
    <div className="graded-slab-label relative z-10 shrink-0 px-[7%] pb-[4%] pt-[5%]">
      <div className="graded-slab-label-inner relative overflow-hidden rounded-[3px] px-[6%] py-[5%]">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <p className="graded-slab-company truncate text-[0.55em] font-black uppercase tracking-[0.18em]">
              {company}
            </p>
            <p className="graded-slab-qualifier mt-[0.15em] truncate text-[0.42em] font-semibold uppercase tracking-wider opacity-90">
              {qualifier.replace(` ${gradeText}`, "")}
            </p>
          </div>
          <div className="graded-slab-grade-badge flex h-[1.85em] min-w-[1.85em] shrink-0 items-center justify-center rounded-[2px] px-[0.25em]">
            <span className="text-[0.95em] font-black leading-none tracking-tight">
              {gradeText}
            </span>
          </div>
        </div>

        <p className="graded-slab-card-name mt-[0.35em] line-clamp-2 text-[0.48em] font-bold leading-snug tracking-tight">
          {cardName}
        </p>

        <div className="mt-[0.3em] flex items-end justify-between gap-1">
          <p className="graded-slab-meta line-clamp-1 text-[0.36em] font-medium uppercase tracking-wide opacity-75">
            {[setName, cardNumber].filter(Boolean).join(" · ") || "Trading Card"}
          </p>
          {certNumber ? (
            <p className="graded-slab-cert shrink-0 font-mono text-[0.34em] tracking-wider opacity-70">
              #{certNumber}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function GradedSlab({
  cardName,
  cardImageUrl,
  setName,
  cardNumber,
  rarity,
  gradingCompany,
  grade,
  certNumber,
  isBlackLabel = false,
  slabImageUrl,
  size = "md",
  className = "",
  interactive = true,
  showReflection = false,
  loading = "lazy",
  foilX: externalFoilX,
  foilY: externalFoilY,
  foilHovered,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), {
    stiffness: 200,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 200,
    damping: 20,
  });
  const internalFoilX = useTransform(x, [-0.5, 0.5], [0, 100]);
  const internalFoilY = useTransform(y, [-0.5, 0.5], [0, 100]);
  const foilX = externalFoilX ?? internalFoilX;
  const foilY = externalFoilY ?? internalFoilY;
  const foilActive = foilHovered ?? hovered;
  const glarePos = useMotionTemplate`${foilX}% ${foilY}%`;
  const foilTier = getFoilTier(rarity);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (reduceMotion || !interactive || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [interactive, reduceMotion, x, y],
  );

  const onLeave = useCallback(() => {
    setHovered(false);
    x.set(0);
    y.set(0);
  }, [x, y]);

  const company = String(gradingCompany).toUpperCase();
  const blackLabel = Boolean(isBlackLabel && company === "BGS");
  const theme = companyTheme(company, blackLabel);
  const overridePhoto = Boolean(slabImageUrl);
  const tiltActive = interactive && hovered && !reduceMotion;

  return (
    <div className={["graded-slab-root relative", SIZE_WIDTH[size], className].join(" ")}>
      <motion.div
        ref={ref}
        className={[
          "graded-slab relative w-full",
          theme,
          interactive ? "cursor-default" : "",
        ].join(" ")}
        style={
          tiltActive
            ? {
                rotateX,
                rotateY,
                transformPerspective: 1000,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
        whileHover={
          reduceMotion || !interactive
            ? undefined
            : { y: -6, scale: 1.03, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }
        }
        onMouseEnter={() => interactive && setHovered(true)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <div className="graded-slab-shell relative overflow-hidden rounded-[10px]">
          <div className="graded-slab-edge pointer-events-none absolute inset-0 rounded-[10px]" aria-hidden />

          {overridePhoto ? (
            <div className="relative aspect-[2.7/4.6] w-full overflow-hidden rounded-[9px] bg-zinc-950">
              <CardImage
                src={slabImageUrl!}
                alt={`${company} ${formatGrade(grade)}${blackLabel ? " Black Label" : ""} — ${cardName}`}
                className="absolute inset-0 h-full w-full object-cover"
                loading={loading}
              />
            </div>
          ) : (
            <div className="relative flex aspect-[2.7/4.6] w-full flex-col overflow-hidden rounded-[9px] bg-[#0a0a0c]">
              <SlabLabel
                company={company}
                grade={grade}
                cardName={cardName}
                setName={setName}
                cardNumber={cardNumber}
                certNumber={certNumber}
                isBlackLabel={blackLabel}
              />

              <div className="graded-slab-well relative mx-[6%] mb-[6%] flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[4px]">
                <div className="relative aspect-[5/7] h-full max-h-full w-auto max-w-full overflow-hidden rounded-[2px] bg-zinc-950 shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                  {cardImageUrl ? (
                    <CardImage
                      src={cardImageUrl}
                      alt={cardName}
                      className="absolute inset-0 h-full w-full object-contain"
                      loading={loading}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-[0.55em] text-zinc-500">
                      No art
                    </div>
                  )}
                  {/* Foil lives on the card, not the acrylic */}
                  <CardFoil
                    tier={foilTier}
                    foilX={foilX}
                    foilY={foilY}
                    hovered={foilActive}
                    reduceMotion={reduceMotion}
                    intensity={0.85}
                  />
                </div>

                <div className="graded-slab-well-glass pointer-events-none absolute inset-0" aria-hidden />
              </div>
            </div>
          )}

          {/* Acrylic glare only — no foil on the slab shell */}
          {!reduceMotion && (
            <motion.div
              className="graded-slab-glare pointer-events-none absolute inset-0 rounded-[10px]"
              style={{
                backgroundPosition: glarePos,
                opacity: foilActive ? 0.75 : 0.32,
              }}
              aria-hidden
            />
          )}
          <div className="graded-slab-sheen pointer-events-none absolute inset-0 rounded-[10px]" aria-hidden />
          <div className="graded-slab-rim pointer-events-none absolute inset-0 rounded-[10px]" aria-hidden />
        </div>

        <div className="graded-slab-shadow pointer-events-none absolute inset-x-[8%] -bottom-2 h-4 rounded-full" aria-hidden />
      </motion.div>

      {showReflection ? (
        <div
          className="graded-slab-reflection pointer-events-none mt-1.5 h-10 overflow-hidden opacity-25"
          aria-hidden
        >
          <div className="origin-top scale-y-[-1]">
            <div className={["graded-slab graded-slab--mirror", theme].join(" ")}>
              <div className="graded-slab-shell overflow-hidden rounded-[10px] opacity-50">
                <div className="aspect-[2.7/4.6] bg-zinc-900/80" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
