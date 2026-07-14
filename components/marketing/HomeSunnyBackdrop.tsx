import Image from "next/image";

/**
 * Full-bleed Grand Line map backdrop (user-provided asset).
 */
export function HomeSunnyBackdrop() {
  return (
    <div className="home-sunny-backdrop" aria-hidden>
      <Image
        src="/home/grand-line-map.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="home-grand-line-photo"
      />
      <div className="home-map-scrim" />
    </div>
  );
}
