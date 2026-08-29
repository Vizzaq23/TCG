"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { centsToInputValue, parseDollarsToCents } from "@/lib/money";
import { SHOP_CONDITIONS } from "@/lib/shop/kinds";

type Props = {
  collectionId: string;
  cardName: string;
  defaultCondition: string | null;
  suggestedPriceCents: number | null;
};

export function ListForSaleButton({
  collectionId,
  cardName,
  defaultCondition,
  suggestedPriceCents,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"single" | "playset">("single");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState(centsToInputValue(suggestedPriceCents));
  const [cost, setCost] = useState("");
  const [condition, setCondition] = useState(defaultCondition ?? "Near Mint");
  const [maxSingles, setMaxSingles] = useState(0);
  const [maxPlaysets, setMaxPlaysets] = useState(0);
  const [pending, setPending] = useState(false);
  const [loadingMax, setLoadingMax] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const max = kind === "playset" ? maxPlaysets : maxSingles;

  async function openForm() {
    setMessage(null);
    setOpen(true);
    setLoadingMax(true);
    const res = await fetch(
      `/api/shop/availability?collectionId=${encodeURIComponent(collectionId)}`,
    );
    const data = (await res.json()) as {
      error?: string;
      maxSingles?: number;
      maxPlaysets?: number;
    };
    setLoadingMax(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not load availability.");
      return;
    }
    setMaxSingles(data.maxSingles ?? 0);
    setMaxPlaysets(data.maxPlaysets ?? 0);
  }

  async function submit() {
    setMessage(null);
    const qty = Math.floor(Number(quantity));
    const priceCents = parseDollarsToCents(price);
    const costCents = cost.trim() ? parseDollarsToCents(cost) : null;
    if (!qty || qty < 1) {
      setMessage("Enter a quantity.");
      return;
    }
    if (qty > max) {
      setMessage(`Only ${max} available to list.`);
      return;
    }
    if (priceCents == null) {
      setMessage("Enter a valid price.");
      return;
    }
    if (cost.trim() && costCents == null) {
      setMessage("Cost basis must be a valid dollar amount.");
      return;
    }

    setPending(true);
    const res = await fetch("/api/shop/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: kind === "playset" ? `${cardName} playset (4)` : cardName,
        collection_id: collectionId,
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
      setMessage(data.error ?? "Could not create listing.");
      return;
    }
    setOpen(false);
    router.push(`/shop/${data.listing?.id ?? ""}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          if (open) setOpen(false);
          else void openForm();
        }}
      >
        {open ? "Cancel" : "List for sale"}
      </Button>
      {open ? (
        <div className="space-y-2 rounded-[12px] border border-zinc-800 bg-zinc-950/80 p-3">
          {loadingMax ? (
            <p className="text-[11px] text-zinc-500">Checking stock…</p>
          ) : (
            <>
              <Field label="Type" className="text-xs">
                <Select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as "single" | "playset")}
                  className="py-1.5 text-sm"
                >
                  <option value="single" disabled={maxSingles < 1}>
                    Single (max {maxSingles})
                  </option>
                  <option value="playset" disabled={maxPlaysets < 1}>
                    Playset ×4 (max {maxPlaysets})
                  </option>
                </Select>
              </Field>
              <Field label="Quantity to list" className="text-xs">
                <Input
                  type="number"
                  min={1}
                  max={max}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="py-1.5 text-sm"
                />
              </Field>
              <Field label="Price (USD)" className="text-xs">
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1.50"
                  className="py-1.5 text-sm"
                />
              </Field>
              <Field label="Cost basis / unit (optional)" className="text-xs">
                <Input
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="What you paid"
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
              <Button
                type="button"
                size="sm"
                onClick={submit}
                loading={pending}
                disabled={pending || max < 1}
              >
                Publish listing
              </Button>
            </>
          )}
          {message ? <p className="text-[11px] text-red-300">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
