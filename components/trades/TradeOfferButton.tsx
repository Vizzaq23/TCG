"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

type Props = {
  collectionId: string;
  cardName: string;
  ownerUsername: string;
  isSignedIn: boolean;
  isOwner: boolean;
};

export function TradeOfferButton({
  collectionId,
  cardName,
  ownerUsername,
  isSignedIn,
  isOwner,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (isOwner) return null;

  if (!isSignedIn) {
    return (
      <Button
        href={`/login?next=${encodeURIComponent(`/u/${ownerUsername}`)}`}
        size="sm"
        variant="secondary"
        className="mt-2 w-full"
      >
        Sign in to offer trade
      </Button>
    );
  }

  if (done) {
    return (
      <p className="mt-2 text-center text-[11px] text-emerald-300/90">
        Offer sent.{" "}
        <Link href="/collection/trades" className="underline underline-offset-2">
          View trades
        </Link>
      </p>
    );
  }

  async function submit() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("create_trade_offer", {
      p_target_collection_id: collectionId,
      p_message: message.trim() || null,
    });
    setPending(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(true);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-2 space-y-2">
      {!open ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => setOpen(true)}
        >
          Request trade
        </Button>
      ) : (
        <div className="space-y-2 rounded-lg border border-zinc-700/80 bg-zinc-950/80 p-2">
          <p className="text-[11px] text-zinc-400">Offer on {cardName}</p>
          <Field label="Message (optional)" className="text-[10px]">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What can you offer?"
              className="py-1.5 text-xs"
              maxLength={280}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={submit}
              disabled={pending}
              loading={pending}
            >
              Send
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
    </div>
  );
}
