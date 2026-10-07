"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MAX_ITEM_QUANTITY } from "@/lib/shop/cart";

type Props = {
  listingId: string;
  maxQuantity: number;
  existingQuantity?: number;
  disabled?: boolean;
};

export function AddToCartButton({ listingId, maxQuantity, existingQuantity = 0, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const quantityLimit = Math.max(0, Math.min(maxQuantity - existingQuantity, MAX_ITEM_QUANTITY - existingQuantity));
  const selectedQuantity = Math.min(quantity, Math.max(1, quantityLimit));

  async function add() {
    setMessage(null);
    setPending(true);
    const res = await fetch("/api/shop/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, quantity: selectedQuantity }),
    });
    setPending(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setMessage(data.error ?? "Could not add to cart.");
      return;
    }
    router.refresh();
    setMessage("Added to cart.");
  }

  return (
    <div className="flex flex-col gap-3">
      {quantityLimit > 1 ? (
        <label className="flex items-center justify-between gap-3 text-sm text-zinc-400">
          Quantity
          <select name="quantity" value={selectedQuantity} disabled={disabled || pending} onChange={(event) => setQuantity(Number(event.target.value))} className="min-h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 text-zinc-200">
            {Array.from({ length: quantityLimit }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      ) : null}
      <Button
        type="button"
        onClick={add}
        disabled={disabled || pending || quantityLimit < 1}
        loading={pending}
      >
        {quantityLimit < 1 ? (maxQuantity < 1 ? "Sold out" : "Maximum in cart") : "Add to cart"}
      </Button>
      {message ? (
        <p aria-live="polite" className="text-center text-[11px] text-zinc-400">
          {message}{" "}
          {message === "Added to cart." ? (
            <a href="/cart" className="text-amber-400 underline underline-offset-2">
              View cart
            </a>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
