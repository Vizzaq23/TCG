"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

type Props = {
  defaultEmail?: string;
  disabled?: boolean;
};

export function CheckoutForm({ defaultEmail = "", disabled }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setError(null);
    setPending(true);
    const res = await fetch("/api/shop/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json()) as { error?: string; url?: string };
    setPending(false);
    if (!res.ok || !data.url) {
      setError(data.error ?? "Checkout failed.");
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <form
      className="space-y-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void checkout();
      }}
    >
      <Field label="Email for receipt" className="text-xs">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="py-1.5 text-sm"
        />
      </Field>
      <p className="text-xs text-zinc-500">
        You will enter your shipping address securely on Stripe Checkout. Inventory is
        reserved when you continue.
      </p>
      <Button
        type="submit"
        className="w-full"
        loading={pending}
        disabled={disabled || pending}
      >
        Continue to Stripe Checkout
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </form>
  );
}
