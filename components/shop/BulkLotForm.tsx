"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { parseDollarsToCents } from "@/lib/money";
import { SHOP_CONDITIONS } from "@/lib/shop/kinds";

export function BulkLotForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"bulk_lot" | "rarity_set">("bulk_lot");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [condition, setCondition] = useState("Near Mint");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const qty = Math.floor(Number(quantity));
    const priceCents = parseDollarsToCents(price);
    const costCents = cost.trim() ? parseDollarsToCents(cost) : null;
    if (!title.trim() || qty < 1 || priceCents == null) {
      setMessage("Title, quantity, and price are required.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/shop/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: title.trim(),
        description: description.trim() || null,
        quantity: qty,
        price_cents: priceCents,
        unit_cost_cents: costCents,
        condition: condition || null,
        status: "active",
      }),
    });
    const data = (await res.json()) as { error?: string; listing?: { id: string } };
    setPending(false);
    if (!res.ok) {
      setMessage(data.error ?? "Failed to create listing.");
      return;
    }
    router.push(`/shop/${data.listing?.id}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4"
    >
      <h2 className="text-sm font-semibold text-white">Create bulk / set listing</h2>
      <Field label="Type" className="text-xs">
        <Select
          value={kind}
          onChange={(e) => setKind(e.target.value as "bulk_lot" | "rarity_set")}
          className="py-1.5 text-sm"
        >
          <option value="bulk_lot">Bulk lot</option>
          <option value="rarity_set">Common / uncommon set</option>
        </Select>
      </Field>
      <Field label="Title" className="text-xs">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="OP07 commons bulk (50 cards)"
          className="py-1.5 text-sm"
        />
      </Field>
      <Field label="Description" className="text-xs">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="py-1.5 text-sm"
          placeholder="What's included, exclusions, condition notes…"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Quantity available" className="text-xs">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="py-1.5 text-sm"
          />
        </Field>
        <Field label="Condition" className="text-xs">
          <Select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="py-1.5 text-sm"
          >
            {SHOP_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Price (USD)" className="text-xs">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="py-1.5 text-sm"
          />
        </Field>
        <Field label="Cost basis / unit (optional)" className="text-xs">
          <Input
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="py-1.5 text-sm"
          />
        </Field>
      </div>
      <Button type="submit" loading={pending} disabled={pending}>
        Publish listing
      </Button>
      {message ? <p className="text-sm text-red-300">{message}</p> : null}
    </form>
  );
}
