"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export type TradeOfferListItem = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  direction: "incoming" | "outgoing";
  counterpartUsername: string;
  counterpartDisplayName: string | null;
  cardName: string;
  cardSet: string | null;
  cardNumber: string | null;
};

type Props = { offers: TradeOfferListItem[] };

function statusTone(status: string): "neutral" | "success" | "accent" | "danger" {
  if (status === "accepted") return "success";
  if (status === "pending") return "accent";
  if (status === "declined" || status === "cancelled") return "danger";
  return "neutral";
}

export function TradeOffersInbox({ offers }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(offerId: string, action: "accept" | "decline" | "cancel") {
    setError(null);
    setPendingId(offerId);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("respond_trade_offer", {
      p_offer_id: offerId,
      p_action: action,
    });
    setPendingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  if (!offers.length) {
    return (
      <p className="rounded-[14px] border border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-400">
        No trade offers yet. When someone requests a card you marked for trade, it shows up
        here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {offers.map((offer) => {
          const busy = pendingId === offer.id;
          const name = offer.counterpartDisplayName ?? offer.counterpartUsername;
          return (
            <li
              key={offer.id}
              className="flex flex-col gap-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone(offer.status)}>{offer.status}</Badge>
                  <Badge>{offer.direction === "incoming" ? "Inbox" : "Sent"}</Badge>
                </div>
                <p className="font-medium text-white">
                  {offer.cardName}
                  <span className="text-zinc-500">
                    {" "}
                    · {[offer.cardSet, offer.cardNumber].filter(Boolean).join(" · ")}
                  </span>
                </p>
                <p className="text-sm text-zinc-400">
                  {offer.direction === "incoming" ? "From" : "To"}{" "}
                  <Link
                    href={`/u/${encodeURIComponent(offer.counterpartUsername)}`}
                    className="text-amber-400/90 underline-offset-2 hover:underline"
                  >
                    @{offer.counterpartUsername}
                  </Link>
                  {name !== offer.counterpartUsername ? ` (${name})` : null}
                </p>
                {offer.message ? (
                  <p className="text-sm text-zinc-300">&ldquo;{offer.message}&rdquo;</p>
                ) : null}
                <p className="text-[11px] text-zinc-600">
                  {new Date(offer.created_at).toLocaleString()}
                </p>
              </div>
              {offer.status === "pending" ? (
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  {offer.direction === "incoming" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => respond(offer.id, "accept")}
                        disabled={busy}
                        loading={busy}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => respond(offer.id, "decline")}
                        disabled={busy}
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => respond(offer.id, "cancel")}
                      disabled={busy}
                    >
                      Cancel offer
                    </Button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
