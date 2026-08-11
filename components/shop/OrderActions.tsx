"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

type Props = {
  orderId: string;
  status: string;
  trackingNumber: string | null;
};

export function OrderActions({ orderId, status, trackingNumber }: Props) {
  const router = useRouter();
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>) {
    setMessage(null);
    setPending(body.refund ? "refund" : String(body.status ?? "save"));
    const res = await fetch(`/api/shop/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    setPending(null);
    if (!res.ok) {
      setMessage(data.error ?? "Update failed.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-[12px] border border-zinc-800 bg-zinc-950/50 p-3">
      <Field label="Tracking number" className="text-xs">
        <Input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Optional"
          className="py-1.5 text-sm"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={pending === "save"}
          disabled={pending !== null}
          onClick={() => patch({ tracking_number: tracking })}
        >
          Save tracking
        </Button>
        {status === "paid" ? (
          <Button
            type="button"
            size="sm"
            loading={pending === "packed"}
            disabled={pending !== null}
            onClick={() => patch({ status: "packed", tracking_number: tracking })}
          >
            Mark packed
          </Button>
        ) : null}
        {status === "paid" || status === "packed" ? (
          <Button
            type="button"
            size="sm"
            loading={pending === "shipped"}
            disabled={pending !== null}
            onClick={() => patch({ status: "shipped", tracking_number: tracking })}
          >
            Mark shipped
          </Button>
        ) : null}
        {["paid", "packed", "shipped"].includes(status) ? (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            loading={pending === "refund"}
            disabled={pending !== null}
            onClick={() => {
              if (
                window.confirm(
                  "Refund this order via Stripe? Optionally restock listing quantities.",
                )
              ) {
                const restock = window.confirm("Also restock listing quantities?");
                void patch({ refund: true, restock });
              }
            }}
          >
            Refund
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-[11px] text-red-300">{message}</p> : null}
    </div>
  );
}
