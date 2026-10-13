"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  COLLECTION_CSV_TEMPLATE,
  parseCollectionCsv,
  type CollectionImportDraft,
} from "@/lib/collection/import-csv";

type ImportApiResponse = {
  error?: string;
  imported?: number;
  unmatched?: string[];
  parseErrors?: string[];
  results?: Array<{
    cardNumber: string;
    cardName: string;
    quantity: number;
  }>;
};

export function CollectionImportDialog() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<CollectionImportDraft[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resultSummary, setResultSummary] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  function resetState() {
    setFileName(null);
    setCsvText("");
    setPreviewRows([]);
    setParseErrors([]);
    setBusy(false);
    setServerError(null);
    setResultSummary(null);
    setUnmatched([]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function close() {
    setOpen(false);
    resetState();
  }

  function applyCsvText(text: string, name: string | null) {
    setCsvText(text);
    setFileName(name);
    setServerError(null);
    setResultSummary(null);
    setUnmatched([]);
    const parsed = parseCollectionCsv(text);
    setPreviewRows(parsed.rows);
    setParseErrors(parsed.errors);
  }

  async function onFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    applyCsvText(text, file.name);
  }

  function downloadTemplate() {
    const blob = new Blob([COLLECTION_CSV_TEMPLATE], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "collection-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!csvText.trim() || previewRows.length === 0 || busy) return;
    setBusy(true);
    setServerError(null);
    setResultSummary(null);
    setUnmatched([]);

    try {
      const res = await fetch("/api/collection/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = (await res.json()) as ImportApiResponse;

      if (!res.ok) {
        setServerError(data.error ?? "Import failed.");
        if (data.parseErrors?.length) setParseErrors(data.parseErrors);
        if (data.unmatched?.length) setUnmatched(data.unmatched);
        return;
      }

      const imported = data.imported ?? 0;
      const skipped = data.unmatched?.length ?? 0;
      setUnmatched(data.unmatched ?? []);
      if (data.parseErrors?.length) setParseErrors(data.parseErrors);
      setResultSummary(
        skipped > 0
          ? `Imported ${imported} card${imported === 1 ? "" : "s"}. ${skipped} card number${skipped === 1 ? "" : "s"} not found in the catalog.`
          : `Imported ${imported} card${imported === 1 ? "" : "s"}.`,
      );
      router.refresh();
    } catch {
      setServerError("Network error while importing. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
      >
        Import CSV
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="collection-import-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[20px] border border-zinc-700 bg-zinc-950 p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="collection-import-title"
                  className="text-lg font-semibold text-zinc-50"
                >
                  Import collection CSV
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Match rows by <code className="text-zinc-300">card_number</code>.
                  Existing shelf entries for the same card are updated.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={close}
                disabled={busy}
              >
                Close
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={downloadTemplate}
              >
                Download template
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                Choose file
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            {fileName ? (
              <p className="mt-3 text-xs text-zinc-500">Selected: {fileName}</p>
            ) : null}

            {parseErrors.length > 0 ? (
              <ul className="mt-4 space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                {parseErrors.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {parseErrors.length > 8 ? (
                  <li>…and {parseErrors.length - 8} more</li>
                ) : null}
              </ul>
            ) : null}

            {previewRows.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full min-w-[420px] text-left text-xs text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Card #</th>
                      <th className="px-3 py-2 font-medium">Qty</th>
                      <th className="px-3 py-2 font-medium">Condition / grade</th>
                      <th className="px-3 py-2 font-medium">Trade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 12).map((row) => (
                      <tr
                        key={`${row.line}-${row.card_number}`}
                        className="border-b border-zinc-900/80"
                      >
                        <td className="px-3 py-2 font-mono text-zinc-200">
                          {row.card_number}
                        </td>
                        <td className="px-3 py-2">{row.quantity}</td>
                        <td className="px-3 py-2">
                          {row.is_graded
                            ? `${row.grading_company} ${row.grade}`
                            : (row.condition ?? "—")}
                        </td>
                        <td className="px-3 py-2">
                          {row.is_for_trade ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 12 ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    Showing 12 of {previewRows.length} rows
                  </p>
                ) : null}
              </div>
            ) : null}

            {serverError ? (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {serverError}
              </p>
            ) : null}

            {resultSummary ? (
              <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                {resultSummary}
              </p>
            ) : null}

            {unmatched.length > 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                Unmatched: {unmatched.slice(0, 10).join(", ")}
                {unmatched.length > 10 ? ` (+${unmatched.length - 10} more)` : ""}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={close}
                disabled={busy}
              >
                {resultSummary ? "Done" : "Cancel"}
              </Button>
              {!resultSummary ? (
                <Button
                  type="button"
                  size="md"
                  loading={busy}
                  disabled={previewRows.length === 0 || busy}
                  onClick={() => void runImport()}
                >
                  Import {previewRows.length || ""} card
                  {previewRows.length === 1 ? "" : "s"}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
