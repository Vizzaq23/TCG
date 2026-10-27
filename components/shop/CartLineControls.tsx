"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cartQuantityLabel } from "@/lib/shop/inventory";

type Props = {
  listingId: string;
  quantity: number;
  maxQuantity: number;
  label: string;
};

export function CartLineControls({ listingId, quantity, maxQuantity, label }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: number) {
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/shop/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity: next }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not update your cart.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach your cart. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={`Quantity for ${label}`}
      aria-busy={pending}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={`Decrease quantity for ${label}`}
        disabled={pending || quantity <= 1}
        onClick={() => update(quantity - 1)}
      >
        −
      </Button>
      <span aria-live="polite" className="min-w-6 text-center text-sm text-white">{cartQuantityLabel(quantity, maxQuantity)}</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={`Increase quantity for ${label}`}
        disabled={pending || quantity >= maxQuantity}
        onClick={() => update(quantity + 1)}
      >
        +
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Remove ${label} from cart`}
        disabled={pending}
        onClick={() => update(0)}
      >
        Remove
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
