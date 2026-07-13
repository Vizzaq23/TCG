"use client";

import { useState } from "react";

type Props = { username: string };

export function CopyShareLink({ username }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/u/${encodeURIComponent(username)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-amber-500/50 hover:text-white"
    >
      {copied ? "Link copied!" : "Copy share link"}
    </button>
  );
}
