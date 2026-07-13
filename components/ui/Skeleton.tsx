import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Optional rounded preset */
  rounded?: "sm" | "md" | "lg" | "full" | "none";
};

const roundedMap = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-[12px]",
  lg: "rounded-[16px]",
  full: "rounded-full",
} as const;

/** Base shimmer block — size it with className (`h-4 w-32`, `aspect-[5/7]`, etc.). */
export function Skeleton({
  className,
  rounded = "md",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn("skeleton", roundedMap[rounded], className)}
      {...props}
    />
  );
}

type SkeletonTextProps = {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
};

/** Stacked text-line placeholders. */
export function SkeletonText({
  lines = 3,
  className,
  lastLineWidth = "w-2/3",
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          rounded="sm"
          className={cn(
            "h-3",
            i === lines - 1 && lines > 1 ? lastLineWidth : "w-full",
          )}
        />
      ))}
    </div>
  );
}

type SkeletonCircleProps = {
  size?: number | string;
  className?: string;
};

export function SkeletonCircle({ size = 40, className }: SkeletonCircleProps) {
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <Skeleton
      rounded="full"
      className={cn("shrink-0", className)}
      style={{ width: dim, height: dim }}
    />
  );
}

/** Catalog / shelf card tile (5:7). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-zinc-800/80 bg-zinc-900/40",
        className,
      )}
    >
      <Skeleton rounded="none" className="aspect-[5/7] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-3 w-4/5" rounded="sm" />
        <Skeleton className="h-2.5 w-1/2" rounded="sm" />
      </div>
    </div>
  );
}

type SkeletonStatProps = { className?: string };

export function SkeletonStat({ className }: SkeletonStatProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-zinc-800/90 bg-zinc-900/40 px-4 py-3.5",
        className,
      )}
    >
      <Skeleton className="h-2.5 w-24" rounded="sm" />
      <Skeleton className="mt-3 h-7 w-16" rounded="sm" />
    </div>
  );
}

export type PageSkeletonVariant =
  | "default"
  | "home"
  | "browse"
  | "collection"
  | "profile"
  | "auth";

type PageSkeletonProps = {
  variant?: PageSkeletonVariant;
  className?: string;
};

/**
 * Full-page loading layouts for route `loading.tsx` files.
 * Compose from the primitives above for custom screens.
 */
export function PageSkeleton({
  variant = "default",
  className,
}: PageSkeletonProps) {
  if (variant === "auth") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-16 sm:px-6",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" rounded="sm" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-2 h-11 w-full" />
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === "home") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-5">
            <Skeleton className="h-6 w-40" rounded="full" />
            <Skeleton className="h-4 w-36" rounded="sm" />
            <Skeleton className="h-14 w-full max-w-sm sm:h-16" />
            <SkeletonText lines={3} className="max-w-md" />
            <div className="flex gap-3">
              <Skeleton className="h-11 w-36" />
              <Skeleton className="h-11 w-32" />
            </div>
          </div>
          <Skeleton className="min-h-[22rem] w-full sm:min-h-[26rem]" rounded="lg" />
        </div>
        <div className="grid gap-6 border-t border-zinc-800/60 pt-8 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" rounded="sm" />
              <Skeleton className="h-4 w-32" rounded="sm" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === "browse") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" rounded="sm" />
        </div>
        <Skeleton className="h-24 w-full" rounded="lg" />
        <Skeleton className="h-4 w-40" rounded="sm" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === "collection") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-64 max-w-full" rounded="sm" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
        <Skeleton className="h-56 w-full" rounded="lg" />
        <div className="space-y-4">
          <Skeleton className="h-5 w-28" rounded="sm" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full" rounded="lg" />
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8",
          className,
        )}
        role="status"
        aria-label="Loading"
      >
        <Skeleton className="min-h-[22rem] w-full sm:min-h-[28rem]" rounded="lg" />
        <div className="space-y-2 border-b border-zinc-800/80 pb-8">
          <Skeleton className="h-3 w-24" rounded="sm" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-32" rounded="sm" />
        </div>
        <Skeleton className="h-10 w-64" rounded="full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-48" />
      <SkeletonText lines={4} className="max-w-xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
