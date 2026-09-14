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

  async function update(next: number) {
    setPending(true);
    await fetch("/api/shop/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, quantity: next }),
    });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending || quantity <= 1}
        onClick={() => update(quantity - 1)}
      >
        −
      </Button>
      <span className="min-w-6 text-center text-sm text-white">{cartQuantityLabel(quantity, maxQuantity)}</span>
      <Button
        type="button"
        size="sm"
        variant="secondary"
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
    </div>
  );
}
