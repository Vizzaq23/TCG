"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { safeNextPath } from "@/lib/auth/safe-next";

type Props = { cardId: string; disabled?: boolean };

function currentLoginHref() {
  if (typeof window === "undefined") return "/login?next=/browse";
  const next = safeNextPath(`${window.location.pathname}${window.location.search}`);
  return `/login?next=${encodeURIComponent(next)}`;
}

export function AddToCollectionButton({ cardId, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loginHref, setLoginHref] = useState("/login?next=/browse");

  async function add() {
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setLoginHref(currentLoginHref());
      setMessage("Sign in to add cards.");
      return;
    }

    const { error } = await supabase.from("user_collections").upsert(
      {
        user_id: user.id,
        card_id: cardId,
        quantity: 1,
        is_for_trade: false,
      },
      { onConflict: "user_id,card_id" },
    );
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
    setMessage("Saved to your collection.");
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={pending || disabled}
        loading={pending}
        onClick={add}
      >
        {pending ? "Saving…" : "Add to collection"}
      </Button>
      {message && (
        <p className="text-center text-[11px] text-zinc-400">
          {message}{" "}
          {message === "Sign in to add cards." && (
            <Link
              href={loginHref}
              className="text-amber-400 underline underline-offset-2 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
