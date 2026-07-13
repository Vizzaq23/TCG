export const GRADING_COMPANIES = ["PSA", "BGS", "CGC", "SGC"] as const;

export type GradingCompany = (typeof GRADING_COMPANIES)[number];

/** Whole and half grades from 1–10 (BGS-style half steps included). */
export const GRADE_OPTIONS: number[] = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5);

export type GradedSlabData = {
  cardName: string;
  cardImageUrl: string | null;
  setName?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
  gradingCompany: GradingCompany | string;
  grade: number | string;
  certNumber?: string | null;
  /** BGS Pristine 10 Black Label */
  isBlackLabel?: boolean;
  /** Optional photo of the physical slab; skips the composite label+art render. */
  slabImageUrl?: string | null;
};

export function isGradedEntry(row: {
  is_graded?: boolean | null;
  grading_company?: string | null;
  grade?: number | string | null;
}): boolean {
  return Boolean(row.is_graded && row.grading_company && row.grade != null);
}

export function formatGrade(grade: number | string): string {
  const n = typeof grade === "string" ? Number.parseFloat(grade) : grade;
  if (!Number.isFinite(n)) return String(grade);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function gradeLabel(
  company: string,
  grade: number | string,
  isBlackLabel = false,
): string {
  const g = formatGrade(grade);
  const n = typeof grade === "string" ? Number.parseFloat(grade) : grade;
  if (company === "BGS" && isBlackLabel && n === 10) return "BLACK LABEL 10";
  if (company === "PSA" && n === 10) return "GEM MT 10";
  if (company === "BGS" && n === 10) return "PRISTINE 10";
  if (company === "CGC" && n === 10) return "Pristine 10";
  if (company === "SGC" && n === 10) return "Pristine 10";
  if (n >= 9) return `MINT ${g}`;
  if (n >= 8) return `NM-MT ${g}`;
  if (n >= 7) return `NM ${g}`;
  if (n >= 5) return `EX ${g}`;
  return `GD ${g}`;
}

export function formatGradedBadge(
  company: string,
  grade: number | string,
  isBlackLabel = false,
): string {
  const base = `${String(company).toUpperCase()} ${formatGrade(grade)}`;
  if (String(company).toUpperCase() === "BGS" && isBlackLabel) {
    return `${base} Black Label`;
  }
  return base;
}
