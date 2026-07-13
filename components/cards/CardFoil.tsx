"use client";

import {
  motion,
  useMotionTemplate,
  type MotionValue,
} from "framer-motion";
import type { FoilTier } from "@/lib/foil";

type Props = {
  tier: FoilTier;
  foilX: MotionValue<number>;
  foilY: MotionValue<number>;
  hovered: boolean;
  reduceMotion?: boolean;
  className?: string;
  intensity?: number;
};

/**
 * GPU-friendly foil overlays. Rainbow is strongest on SP/Secret/Manga;
 * Super Rare gets a light prismatic hint.
 */
export function CardFoil({
  tier,
  foilX,
  foilY,
  hovered,
  reduceMotion = false,
  className = "",
  intensity = 1,
}: Props) {
  const pos = useMotionTemplate`${foilX}% ${foilY}%`;
  const posAlt = useMotionTemplate`${foilY}% ${foilX}%`;
  const sweepX = useMotionTemplate`calc(${foilX}% - 40%)`;

  if (tier === "none" || reduceMotion) {
    return tier === "none" ? null : (
      <div
        className={[
          "card-foil card-foil--static-gloss pointer-events-none absolute inset-0",
          className,
        ].join(" ")}
        style={{ opacity: 0.22 * intensity }}
        aria-hidden
      />
    );
  }

  const baseOpacity = (idle: number, active: number) =>
    (hovered ? active : idle) * intensity;

  const showRainbow = tier === "super" || tier === "holo" || tier === "manga";

  return (
    <div
      className={["card-foil pointer-events-none absolute inset-0 overflow-hidden", className].join(
        " ",
      )}
      aria-hidden
    >
      <motion.div
        className="card-foil-specular absolute inset-0"
        style={{
          backgroundPosition: pos,
          opacity: baseOpacity(tier === "gloss" ? 0.18 : 0.22, tier === "gloss" ? 0.38 : 0.5),
        }}
      />

      {(tier === "rare" || showRainbow) && (
        <motion.div
          className="card-foil-shine absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.2, 0.44),
          }}
        />
      )}

      {showRainbow && (
        <motion.div
          className="card-foil-lines absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.16, 0.34),
          }}
        />
      )}

      {/* Light prism on Super Rare */}
      {tier === "super" && (
        <motion.div
          className="card-foil-rainbow card-foil-rainbow--soft absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.14, 0.32),
          }}
        />
      )}

      {/* Full rainbow — SP / Secret / AA */}
      {(tier === "holo" || tier === "manga") && (
        <>
          <motion.div
            className="card-foil-rainbow absolute inset-0"
            style={{
              backgroundPosition: pos,
              opacity: baseOpacity(0.38, 0.72),
            }}
          />
          <motion.div
            className="card-foil-prism absolute inset-0"
            style={{
              backgroundPosition: posAlt,
              opacity: baseOpacity(0.22, 0.48),
            }}
          />
        </>
      )}

      {tier === "manga" && (
        <>
          <motion.div
            className="card-foil-manga absolute inset-0"
            style={{
              backgroundPosition: pos,
              opacity: baseOpacity(0.34, 0.7),
            }}
          />
          <motion.div
            className="card-foil-gold absolute inset-0"
            style={{
              backgroundPosition: pos,
              opacity: baseOpacity(0.24, 0.55),
            }}
          />
        </>
      )}

      {tier === "holo" && (
        <motion.div
          className="card-foil-gold absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.16, 0.4),
          }}
        />
      )}

      {hovered ? (
        <motion.div
          className={[
            "card-foil-sweep absolute inset-0",
            showRainbow && tier !== "super" ? "card-foil-sweep--rainbow" : "",
          ].join(" ")}
          style={{
            x: sweepX,
            opacity: (showRainbow && tier !== "super" ? 0.5 : 0.35) * intensity,
          }}
        />
      ) : null}
    </div>
  );
}
