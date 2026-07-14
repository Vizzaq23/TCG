"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import {
  GRADE_OPTIONS,
  GRADING_COMPANIES,
  type GradingCompany,
} from "@/lib/types/grading";
import { CardImage } from "@/components/cards/CardImage";
import { GradedSlab } from "@/components/cards/GradedSlab";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { centsToInputValue, formatUsdCents, parseDollarsToCents } from "@/lib/money";
import { MarketPrice } from "@/components/prices/MarketPrice";
import { PriceLastUpdated } from "@/components/prices/PriceLastUpdated";

type UC = Database["public"]["Tables"]["user_collections"]["Row"];
type Card = Database["public"]["Tables"]["cards"]["Row"];

export type CollectionRowData = UC & { cards: Card | null };

const CONDITIONS = [
  "",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
];

type Props = { row: CollectionRowData };

export function CollectionRow({ row }: Props) {
  const router = useRouter();
  const card = row.cards;
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [condition, setCondition] = useState(row.condition ?? "");
  const [notes, setNotes] = useState(row.notes ?? "");
  const [forTrade, setForTrade] = useState(row.is_for_trade);
  const [isGraded, setIsGraded] = useState(row.is_graded);
  const [gradingCompany, setGradingCompany] = useState<GradingCompany | "">(
    (row.grading_company as GradingCompany | null) ?? "",
  );
  const [grade, setGrade] = useState(() => {
    if (row.grade == null) return "";
    const n = Number(row.grade);
    if (!Number.isFinite(n)) return String(row.grade);
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  });
  const [certNumber, setCertNumber] = useState(row.cert_number ?? "");
  const [slabImageUrl, setSlabImageUrl] = useState(row.slab_image_url ?? "");
  const [isBlackLabel, setIsBlackLabel] = useState(row.is_black_label ?? false);
  const [estimatedValue, setEstimatedValue] = useState(
    centsToInputValue(row.estimated_value_cents),
  );
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!card) {
    return null;
  }

  async function save() {
    setMessage(null);
    const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);

    if (isGraded && (!gradingCompany || !grade)) {
      setMessage("Graded cards need a company and grade.");
      return;
    }

    const gradeValue = isGraded ? Number.parseFloat(grade) : null;
    if (
      isGraded &&
      (gradeValue == null || Number.isNaN(gradeValue) || gradeValue < 1 || gradeValue > 10)
    ) {
      setMessage("Grade must be between 1 and 10.");
      return;
    }

    const blackLabel =
      isGraded && gradingCompany === "BGS" && gradeValue === 10 && isBlackLabel;

    let valueCents: number | null = null;
    if (estimatedValue.trim()) {
      valueCents = parseDollarsToCents(estimatedValue);
      if (valueCents == null) {
        setMessage("Estimated value must be a non-negative dollar amount.");
        return;
      }
    }

    setPending("save");
    const supabase = createClient();
    const { error } = await supabase
      .from("user_collections")
      .update({
        quantity: qty,
        condition: isGraded ? null : condition || null,
        notes: notes.trim() || null,
        is_for_trade: forTrade,
        is_graded: isGraded,
        grading_company: isGraded ? gradingCompany : null,
        grade: isGraded ? gradeValue : null,
        cert_number: isGraded ? certNumber.trim() || null : null,
        slab_image_url: isGraded ? slabImageUrl.trim() || null : null,
        is_black_label: blackLabel,
        estimated_value_cents: valueCents,
      })
      .eq("id", row.id);
    setPending(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this card from your collection?")) return;
    setMessage(null);
    setPending("remove");
    const supabase = createClient();
    const { error } = await supabase.from("user_collections").delete().eq("id", row.id);
    setPending(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.refresh();
  }

  const previewGraded = isGraded && gradingCompany && grade;

  return (
    <li className="flex flex-col gap-4 rounded-[14px] border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row">
      <div className="flex gap-3 sm:w-72 sm:flex-shrink-0">
        {previewGraded ? (
          <GradedSlab
            cardName={card.name}
            cardImageUrl={card.image_url}
            setName={card.set_name}
            cardNumber={card.card_number}
            rarity={card.rarity}
            gradingCompany={gradingCompany}
            grade={grade}
            certNumber={certNumber || null}
            isBlackLabel={gradingCompany === "BGS" && grade === "10" && isBlackLabel}
            slabImageUrl={slabImageUrl || null}
            size="sm"
            interactive={false}
            className="flex-shrink-0"
          />
        ) : (
          <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-[12px] border border-zinc-800 bg-zinc-950 sm:h-32 sm:w-[5.5rem]">
            {card.image_url ? (
              <CardImage
                src={card.image_url}
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                No art
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-semibold text-white">{card.name}</p>
          <p className="text-xs text-zinc-500">
            {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {previewGraded ? (
              <Badge tone="accent">
                {gradingCompany} {grade}
                {gradingCompany === "BGS" && grade === "10" && isBlackLabel
                  ? " Black Label"
                  : ""}
              </Badge>
            ) : (
              <Badge>Raw</Badge>
            )}
            {forTrade ? <Badge tone="success">For trade</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Quantity" className="text-xs">
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="py-1.5 text-sm"
          />
        </Field>

        <label className="flex items-center gap-2 self-end pb-2 text-xs text-zinc-300">
          <input
            type="checkbox"
            checked={isGraded}
            onChange={(e) => {
              const next = e.target.checked;
              setIsGraded(next);
              if (next && !gradingCompany) setGradingCompany("PSA");
              if (next && !grade) setGrade("10");
              if (!next) setIsBlackLabel(false);
            }}
            className="size-4 rounded border-zinc-600 accent-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
          Graded slab
        </label>

        {isGraded ? (
          <>
            <Field label="Grading company" className="text-xs">
              <Select
                value={gradingCompany}
                onChange={(e) => {
                  const next = e.target.value as GradingCompany;
                  setGradingCompany(next);
                  if (next !== "BGS") setIsBlackLabel(false);
                }}
                className="py-1.5 text-sm"
              >
                {GRADING_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Grade" className="text-xs">
              <Select
                value={grade}
                onChange={(e) => {
                  const next = e.target.value;
                  setGrade(next);
                  if (next !== "10") setIsBlackLabel(false);
                }}
                className="py-1.5 text-sm"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={String(g)}>
                    {Number.isInteger(g) ? g : g.toFixed(1)}
                  </option>
                ))}
              </Select>
            </Field>
            {gradingCompany === "BGS" && grade === "10" ? (
              <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isBlackLabel}
                  onChange={(e) => setIsBlackLabel(e.target.checked)}
                  className="size-4 rounded border-zinc-600 accent-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                />
                Black Label
              </label>
            ) : null}
            <Field label="Certification number" className="text-xs sm:col-span-2">
              <Input
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="Optional"
                className="py-1.5 text-sm"
              />
            </Field>
            <Field label="Slab image URL" className="text-xs sm:col-span-2">
              <Input
                value={slabImageUrl}
                onChange={(e) => setSlabImageUrl(e.target.value)}
                placeholder="Optional override photo"
                className="py-1.5 text-sm"
              />
            </Field>
          </>
        ) : (
          <Field label="Condition" className="text-xs">
            <Select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="py-1.5 text-sm"
            >
              {CONDITIONS.map((c) => (
                <option key={c || "none"} value={c}>
                  {c || "Not set"}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Est. value (USD)" className="text-xs">
          <Input
            type="text"
            inputMode="decimal"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder={
              card.market_price_cents != null
                ? `Market ${formatUsdCents(card.market_price_cents)}`
                : "e.g. 12.50"
            }
            className="py-1.5 text-sm"
          />
          {card.market_price_cents != null ? (
            <p className="mt-1 text-[10px] text-zinc-500">
              JustTCG NM {formatUsdCents(card.market_price_cents)}
              {card.market_price_updated_at
                ? ` · ${new Date(card.market_price_updated_at).toLocaleDateString()}`
                : ""}
              . Leave blank to use market
              {isGraded ? " (shown as underlying raw for graded slabs)" : ""}.
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-zinc-600">
              No market price yet — enter a manual estimate, or wait for the next price refresh.
            </p>
          )}
        </Field>
        {card.market_price_cents != null || isGraded ? (
          <div className="sm:col-span-2">
            <MarketPrice
              cents={card.market_price_cents}
              size="sm"
              label={isGraded ? "Underlying raw market" : "Market"}
              unavailable={card.market_price_cents == null}
            />
            <PriceLastUpdated fetchedAt={card.market_price_updated_at} />
          </div>
        ) : null}
        <Field label="Notes" className="text-xs sm:col-span-2 lg:col-span-2">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Language, memories…"
            className="py-1.5 text-sm"
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2 lg:col-span-1">
          <input
            type="checkbox"
            checked={forTrade}
            onChange={(e) => setForTrade(e.target.checked)}
            className="size-4 rounded border-zinc-600 accent-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          />
          For trade
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:w-36 sm:flex-shrink-0">
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={pending !== null}
          loading={pending === "save"}
        >
          {pending === "save" ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={remove}
          disabled={pending !== null}
          loading={pending === "remove"}
        >
          {pending === "remove" ? "Removing…" : "Remove"}
        </Button>
        {message && <p className="text-[11px] text-red-300">{message}</p>}
      </div>
    </li>
  );
}
