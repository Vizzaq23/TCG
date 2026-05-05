"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Props = { cardId: string; disabled?: boolean };

export function AddToCollectionButton({ cardId, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setMessage(null);
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
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
      <button
        type="button"
        disabled={pending || disabled}
        onClick={add}
        className="w-full rounded-md bg-amber-500/90 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add to collection"}
      </button>
      {message && (
        <p className="text-center text-[11px] text-zinc-400">
          {message}{" "}
          {message === "Sign in to add cards." && (
            <Link href="/login" className="text-amber-400 underline">
              Sign in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
