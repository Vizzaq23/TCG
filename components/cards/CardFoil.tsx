"use client";

import {
  motion,
  useMotionTemplate,
  type MotionValue,
} from "framer-motion";
import type { FoilTier } from "@/lib/foil";

type Props = {
  tier: FoilTier;
  /** Pointer X as 0–100% */
  foilX: MotionValue<number>;
  /** Pointer Y as 0–100% */
  foilY: MotionValue<number>;
  hovered: boolean;
  reduceMotion?: boolean;
  className?: string;
  /** Soften intensity (e.g. card behind acrylic) */
  intensity?: number;
};

/**
 * GPU-friendly foil / holographic overlays. Effect strength scales with rarity tier.
 * Common = none; Uncommon = gloss; Rare = soft shine; SR = diagonal foil;
 * Secret = rainbow holo; Treasure/Manga/AA = premium multi-color foil.
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
  const sweepX = useMotionTemplate`calc(${foilX}% - 40%)`;

  if (tier === "none" || reduceMotion) {
    return tier === "none" ? null : (
      <div
        className={["card-foil card-foil--static-gloss pointer-events-none absolute inset-0", className].join(
          " ",
        )}
        style={{ opacity: 0.22 * intensity }}
        aria-hidden
      />
    );
  }

  const baseOpacity = (idle: number, active: number) =>
    (hovered ? active : idle) * intensity;

  return (
    <div
      className={["card-foil pointer-events-none absolute inset-0 overflow-hidden", className].join(
        " ",
      )}
      aria-hidden
    >
      {/* Specular highlight — directional light following cursor */}
      {(tier === "gloss" ||
        tier === "rare" ||
        tier === "super" ||
        tier === "holo" ||
        tier === "manga") && (
        <motion.div
          className="card-foil-specular absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(
              tier === "gloss" ? 0.18 : 0.22,
              tier === "gloss" ? 0.38 : 0.48,
            ),
          }}
        />
      )}

      {/* Soft diagonal gloss for Rare+ */}
      {(tier === "rare" || tier === "super" || tier === "holo" || tier === "manga") && (
        <motion.div
          className="card-foil-shine absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.2, 0.42),
          }}
        />
      )}

      {/* Stronger SR foil lines */}
      {(tier === "super" || tier === "holo" || tier === "manga") && (
        <motion.div
          className="card-foil-lines absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.18, 0.36),
          }}
        />
      )}

      {/* Rainbow holographic — Secret / high end */}
      {(tier === "holo" || tier === "manga") && (
        <motion.div
          className="card-foil-rainbow absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(tier === "manga" ? 0.28 : 0.22, tier === "manga" ? 0.55 : 0.48),
          }}
        />
      )}

      {/* Manga / Treasure premium multi-layer */}
      {tier === "manga" && (
        <motion.div
          className="card-foil-manga absolute inset-0"
          style={{
            backgroundPosition: pos,
            opacity: baseOpacity(0.25, 0.52),
          }}
        />
      )}

      {/* Soft light sweep on hover */}
      {hovered && (
        <motion.div
          className="card-foil-sweep absolute inset-0"
          style={{
            x: sweepX,
            opacity: 0.35 * intensity,
          }}
        />
      )}
    </div>
  );
}
