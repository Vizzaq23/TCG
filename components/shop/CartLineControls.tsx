"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cartQuantityLabel } from "@/lib/shop/inventory";

type Props = {
  listingId: string;
  quantity: number;
  maxQuantity: number;
};

export function CartLineControls({ listingId, quantity, maxQuantity }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: number) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/shop/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity: next }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Your cart could not be updated. Please retry.");
        return;
      }
      router.refresh();
    } catch {
      setError("Your cart update could not be confirmed. Please retry shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Cart item quantity"
      aria-busy={pending}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label="Decrease quantity"
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
        aria-label="Increase quantity"
        disabled={pending || quantity >= maxQuantity}
        onClick={() => update(quantity + 1)}
      >
        +
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => update(0)}
      >
        Remove
      </Button>
      {error ? <p role="alert" className="basis-full text-xs text-amber-200">{error}</p> : null}
    </div>
  );
}
