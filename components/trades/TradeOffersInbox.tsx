"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CardImage } from "@/components/cards/CardImage";
import { formatGradedBadge } from "@/lib/types/grading";
import { shelfCardPath } from "@/lib/shelf-links";

export type TradeOfferListItem = {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
  direction: "incoming" | "outgoing";
  counterpartUsername: string;
  counterpartDisplayName: string | null;
  ownerUsername: string;
  cardId: string;
  cardName: string;
  cardSet: string | null;
  cardNumber: string | null;
  imageUrl: string | null;
  quantity: number;
  condition: string | null;
  notes: string | null;
  isGraded: boolean;
  gradingCompany: string | null;
  grade: number | null;
  isBlackLabel: boolean;
};

type Props = { offers: TradeOfferListItem[] };

function statusTone(status: string): "neutral" | "success" | "accent" | "danger" {
  if (status === "accepted") return "success";
  if (status === "pending") return "accent";
  if (status === "declined" || status === "cancelled") return "danger";
  return "neutral";
}

function contextBadges(offer: TradeOfferListItem) {
  const badges: string[] = [];
  if (offer.quantity > 1) badges.push(`×${offer.quantity}`);
  if (offer.isGraded && offer.gradingCompany && offer.grade != null) {
    badges.push(
      formatGradedBadge(offer.gradingCompany, offer.grade, offer.isBlackLabel),
    );
  } else if (offer.condition) {
    badges.push(offer.condition);
  }
  return badges;
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
      <p className="empty-state px-4 py-10 text-center text-sm">
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
          const badges = contextBadges(offer);
          return (
            <li
              key={offer.id}
              className="surface-card flex flex-col gap-4 rounded-[18px] p-4 transition hover:border-zinc-700 sm:flex-row sm:items-start sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="relative h-24 w-[68px] flex-shrink-0 overflow-hidden rounded-[10px] border border-zinc-800 bg-zinc-950">
                  {offer.imageUrl ? (
                    <CardImage
                      src={offer.imageUrl}
                      alt={offer.cardName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                      No art
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(offer.status)}>{offer.status}</Badge>
                    <Badge>{offer.direction === "incoming" ? "Inbox" : "Sent"}</Badge>
                    {badges.map((b) => (
                      <Badge key={b} tone="neutral">
                        {b}
                      </Badge>
                    ))}
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
                  {offer.notes?.trim() ? (
                    <p className="line-clamp-2 text-sm italic text-zinc-400">
                      “{offer.notes.trim()}”
                    </p>
                  ) : null}
                  {offer.message ? (
                    <p className="text-sm text-zinc-300">&ldquo;{offer.message}&rdquo;</p>
                  ) : null}
                  <div className="flex flex-wrap gap-3 pt-0.5 text-xs">
                    <Link
                      href={`/browse/${encodeURIComponent(offer.cardId)}`}
                      className="text-zinc-400 underline-offset-2 hover:text-amber-200 hover:underline"
                    >
                      View card
                    </Link>
                    <Link
                      href={shelfCardPath(offer.ownerUsername, offer.cardId, {
                        trade: true,
                      })}
                      className="text-zinc-400 underline-offset-2 hover:text-amber-200 hover:underline"
                    >
                      View shelf
                    </Link>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    {new Date(offer.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {offer.status === "pending" ? (
                <div className="flex flex-shrink-0 flex-wrap gap-2 sm:pt-1">
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
