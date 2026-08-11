"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { centsToInputValue, parseDollarsToCents } from "@/lib/money";

type Props = {
  storeName: string;
  supportEmail: string | null;
  shippingCents: number;
};

export function ShopSettingsForm({
  storeName,
  supportEmail,
  shippingCents,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(storeName);
  const [email, setEmail] = useState(supportEmail ?? "");
  const [shipping, setShipping] = useState(centsToInputValue(shippingCents));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const shippingValue = parseDollarsToCents(shipping);
    if (shippingValue == null) {
      setMessage("Shipping must be a valid dollar amount.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPending(false);
      setMessage("Sign in required.");
      return;
    }
    const { error } = await supabase
      .from("shop_settings")
      .update({
        store_name: name.trim() || "TCG Shop",
        support_email: email.trim() || null,
        shipping_cents: shippingValue,
      })
      .eq("owner_user_id", user.id);
    setPending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4"
    >
      <h2 className="text-sm font-semibold text-white">Store settings</h2>
      <Field label="Store name" className="text-xs">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="py-1.5 text-sm"
        />
      </Field>
      <Field label="Support email" className="text-xs">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="py-1.5 text-sm"
        />
      </Field>
      <Field label="Flat US shipping (USD)" className="text-xs">
        <Input
          value={shipping}
          onChange={(e) => setShipping(e.target.value)}
          className="py-1.5 text-sm"
        />
      </Field>
      <Button type="submit" size="sm" loading={pending} disabled={pending}>
        Save settings
      </Button>
      {message ? <p className="text-[11px] text-zinc-400">{message}</p> : null}
    </form>
  );
}
