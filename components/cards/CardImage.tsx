"use client";

import { useState } from "react";

const PROXY_HOST = "en.onepiece-cardgame.com";

function cardImageSrc(src: string): string {
  try {
    const url = new URL(src);
    if (url.hostname === PROXY_HOST) {
      return `/api/card-image?url=${encodeURIComponent(src)}`;
    }
  } catch {
    // fall through
  }
  return src;
}

type Props = {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Subtle unsharp + contrast (default on) */
  sharpen?: boolean;
};

export function CardImage({
  src,
  alt = "",
  className,
  loading,
  sharpen = true,
}: Props) {
  const [failed, setFailed] = useState(false);
  const resolvedSrc = cardImageSrc(src);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] text-zinc-500">
        Image unavailable
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={[sharpen ? "card-art" : "", className].filter(Boolean).join(" ")}
      loading={loading}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
