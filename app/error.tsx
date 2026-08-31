"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center px-5 py-16">
      <div className="w-full space-y-4 rounded-[16px] border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          The page could not be loaded. No payment should be retried unless Stripe
          clearly reports that it failed.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-zinc-600">Reference: {error.digest}</p>
        ) : null}
        <Button type="button" onClick={() => unstable_retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
