"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  accentColor?: string;
};

const sizes = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg sm:h-20 sm:w-20 sm:text-xl",
} as const;

export function ProfileAvatar({
  src,
  name,
  size = "md",
  className,
  accentColor = "#f59e0b",
}: Props) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user avatar URLs
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={cn(
          "shrink-0 rounded-full object-cover ring-2 ring-offset-2 ring-offset-zinc-950",
          sizes[size],
          className,
        )}
        style={{ ["--tw-ring-color" as string]: accentColor }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-zinc-950",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: accentColor }}
    >
      {initial}
    </span>
  );
}
