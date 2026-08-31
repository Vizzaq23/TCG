"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Props = {
  listingId: string;
  maxQuantity: number;
  disabled?: boolean;
};

export function AddToCartButton({ listingId, maxQuantity, disabled }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    setMessage(null);
    setPending(true);
    const res = await fetch("/api/shop/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, quantity: 1 }),
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
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        onClick={add}
        disabled={disabled || pending || maxQuantity < 1}
        loading={pending}
      >
        {maxQuantity < 1 ? "Sold out" : "Add to cart"}
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
