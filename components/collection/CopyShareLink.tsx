"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

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
    <Button type="button" variant="secondary" size="md" onClick={copy}>
      {copied ? "Link copied!" : "Copy share link"}
    </Button>
  );
}
