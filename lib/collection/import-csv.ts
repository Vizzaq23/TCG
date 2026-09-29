export type CollectionImportDraft = {
  card_number: string;
  quantity: number;
  condition: string | null;
  notes: string | null;
  is_for_trade: boolean;
  is_graded: boolean;
  grading_company: string | null;
  grade: number | null;
  cert_number: string | null;
  slab_image_url: string | null;
  is_black_label: boolean;
  estimated_value_cents: number | null;
  /** 1-based CSV line number for error reporting */
  line: number;
};

export type CollectionImportParseResult = {
  rows: CollectionImportDraft[];
  errors: string[];
};

const CONDITIONS = new Set([
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
]);

const GRADING_COMPANIES = new Set(["PSA", "BGS", "CGC", "SGC"]);

/** Split a CSV line respecting double-quoted fields. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[\s-]+/g, "_");
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || !raw.trim()) return fallback;
  const v = raw.trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(v)) return true;
  if (["false", "no", "n", "0"].includes(v)) return false;
  return fallback;
}

function parseQuantity(raw: string | undefined): number | null {
  if (raw == null || !raw.trim()) return 1;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseGrade(raw: string | undefined): number | null {
  if (raw == null || !raw.trim()) return null;
  const n = Number.parseFloat(raw.trim());
  if (!Number.isFinite(n) || n < 1 || n > 10) return null;
  return n;
}

function parseUsdToCents(raw: string | undefined): number | null {
  if (raw == null || !raw.trim()) return null;
  const n = Number.parseFloat(raw.trim().replace(/[$,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function normalizeCondition(raw: string | undefined): string | null {
  if (raw == null || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (CONDITIONS.has(trimmed)) return trimmed;
  // Loose aliases
  const lower = trimmed.toLowerCase();
  if (lower === "nm" || lower === "near mint") return "Near Mint";
  if (lower === "lp" || lower === "lightly played") return "Lightly Played";
  if (lower === "mp" || lower === "moderately played") return "Moderately Played";
  if (lower === "hp" || lower === "heavily played") return "Heavily Played";
  if (lower === "dmg" || lower === "damaged") return "Damaged";
  return trimmed;
}

/**
 * Parse a collection CSV string into draft rows.
 * Required header: card_number
 */
export function parseCollectionCsv(text: string): CollectionImportParseResult {
  const errors: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["CSV needs a header row and at least one data row."],
    };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);
  const cardNumberIdx = idx("card_number");
  if (cardNumberIdx < 0) {
    return {
      rows: [],
      errors: ["Missing required column: card_number"],
    };
  }

  const rows: CollectionImportDraft[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const cols = splitCsvLine(lines[i]);
    const get = (name: string) => {
      const j = idx(name);
      return j >= 0 ? cols[j] ?? "" : "";
    };

    const card_number = get("card_number").trim();
    if (!card_number) {
      errors.push(`Line ${lineNo}: card_number is required.`);
      continue;
    }

    const quantity = parseQuantity(get("quantity"));
    if (quantity == null) {
      errors.push(`Line ${lineNo}: quantity must be an integer ≥ 1.`);
      continue;
    }

    const is_graded = parseBool(get("is_graded"), false);
    let grading_company = get("grading_company").trim().toUpperCase() || null;
    if (grading_company === "") grading_company = null;
    const grade = parseGrade(get("grade"));
    const cert_number = get("cert_number").trim() || null;
    const slab_image_url = get("slab_image_url").trim() || null;
    let is_black_label = parseBool(get("is_black_label"), false);
    let condition = normalizeCondition(get("condition"));
    let notes = get("notes").trim() || null;
    if (notes && notes.length > 280) notes = notes.slice(0, 280);

    if (is_graded) {
      condition = null;
      if (!grading_company || !GRADING_COMPANIES.has(grading_company)) {
        errors.push(
          `Line ${lineNo}: graded rows need grading_company (PSA, BGS, CGC, or SGC).`,
        );
        continue;
      }
      if (grade == null) {
        errors.push(`Line ${lineNo}: graded rows need a grade between 1 and 10.`);
        continue;
      }
      if (is_black_label && !(grading_company === "BGS" && grade === 10)) {
        errors.push(
          `Line ${lineNo}: is_black_label only allowed for BGS 10.`,
        );
        continue;
      }
    } else {
      grading_company = null;
      is_black_label = false;
    }

    rows.push({
      card_number,
      quantity,
      condition: is_graded ? null : condition,
      notes,
      is_for_trade: parseBool(get("is_for_trade"), false),
      is_graded,
      grading_company: is_graded ? grading_company : null,
      grade: is_graded ? grade : null,
      cert_number: is_graded ? cert_number : null,
      slab_image_url: is_graded ? slab_image_url : null,
      is_black_label: is_graded ? is_black_label : false,
      estimated_value_cents: parseUsdToCents(
        get("estimated_value_usd") || get("estimated_value"),
      ),
      line: lineNo,
    });
  }

  return { rows, errors };
}

export const COLLECTION_CSV_TEMPLATE = `card_number,quantity,condition,notes,is_for_trade,is_graded,grading_company,grade,estimated_value_usd
OP01-001,1,Near Mint,Starter deck copy,false,false,,,
OP01-016,2,Lightly Played,,true,false,,,
OP01-121,1,,Alt art grail,false,true,PSA,10,450.00
`;
