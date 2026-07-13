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
    if (isGraded && (gradeValue == null || Number.isNaN(gradeValue) || gradeValue < 1 || gradeValue > 10)) {
      setMessage("Grade must be between 1 and 10.");
      return;
    }

    const blackLabel =
      isGraded && gradingCompany === "BGS" && gradeValue === 10 && isBlackLabel;

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
    <li className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row">
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
          <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-zinc-950 sm:h-32 sm:w-[5.5rem]">
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
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{card.name}</p>
          <p className="text-xs text-zinc-500">
            {[card.set_name, card.card_number].filter(Boolean).join(" · ")}
          </p>
          {previewGraded ? (
            <p className="mt-1.5 text-[11px] font-semibold text-amber-300/90">
              {gradingCompany} {grade}
              {gradingCompany === "BGS" && grade === "10" && isBlackLabel
                ? " Black Label"
                : ""}
              {certNumber ? ` · #${certNumber}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
          />
        </label>

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
            className="size-4 rounded border-zinc-600"
          />
          Graded slab
        </label>

        {isGraded ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Grading company
              <select
                value={gradingCompany}
                onChange={(e) => {
                  const next = e.target.value as GradingCompany;
                  setGradingCompany(next);
                  if (next !== "BGS") setIsBlackLabel(false);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
              >
                {GRADING_COMPANIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Grade
              <select
                value={grade}
                onChange={(e) => {
                  const next = e.target.value;
                  setGrade(next);
                  if (next !== "10") setIsBlackLabel(false);
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={String(g)}>
                    {Number.isInteger(g) ? g : g.toFixed(1)}
                  </option>
                ))}
              </select>
            </label>
            {gradingCompany === "BGS" && grade === "10" ? (
              <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isBlackLabel}
                  onChange={(e) => setIsBlackLabel(e.target.checked)}
                  className="size-4 rounded border-zinc-600"
                />
                Black Label
              </label>
            ) : null}
            <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
              Certification number
              <input
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
                placeholder="Optional"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2">
              Slab image URL
              <input
                value={slabImageUrl}
                onChange={(e) => setSlabImageUrl(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
                placeholder="Optional override photo"
              />
            </label>
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Condition
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
            >
              {CONDITIONS.map((c) => (
                <option key={c || "none"} value={c}>
                  {c || "Not set"}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-zinc-400 sm:col-span-2 lg:col-span-2">
          Notes
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white"
            placeholder="Language, memories…"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-300 sm:col-span-2 lg:col-span-1">
          <input
            type="checkbox"
            checked={forTrade}
            onChange={(e) => setForTrade(e.target.checked)}
            className="size-4 rounded border-zinc-600"
          />
          For trade
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:w-36 sm:flex-shrink-0">
        <button
          type="button"
          onClick={save}
          disabled={pending !== null}
          className="rounded-lg bg-amber-500 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {pending === "save" ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending !== null}
          className="rounded-lg border border-red-500/50 py-2 text-xs font-semibold text-red-200 hover:bg-red-950/40 disabled:opacity-50"
        >
          {pending === "remove" ? "Removing…" : "Remove"}
        </button>
        {message && <p className="text-[11px] text-red-300">{message}</p>}
      </div>
    </li>
  );
}
