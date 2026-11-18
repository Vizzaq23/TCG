import { describe, expect, it } from "vitest";
import {
  COLLECTION_CSV_TEMPLATE,
  parseCollectionCsv,
  splitCsvLine,
} from "@/lib/collection/import-csv";

describe("splitCsvLine", () => {
  it("handles quoted commas", () => {
    expect(splitCsvLine('OP01-001,"pulled from pack, keep",true')).toEqual([
      "OP01-001",
      "pulled from pack, keep",
      "true",
    ]);
  });
});

describe("parseCollectionCsv", () => {
  it("parses the template with valid rows", () => {
    const result = parseCollectionCsv(COLLECTION_CSV_TEMPLATE);
    expect(result.rows).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]?.card_number).toBe("OP01-001");
    expect(result.rows[0]?.quantity).toBe(1);
    expect(result.rows[0]?.is_for_trade).toBe(false);
    expect(result.rows[1]?.is_for_trade).toBe(true);
    expect(result.rows[2]?.is_graded).toBe(true);
    expect(result.rows[2]?.grading_company).toBe("PSA");
    expect(result.rows[2]?.grade).toBe(10);
    expect(result.rows[2]?.estimated_value_cents).toBe(45000);
  });

  it("rejects missing card numbers and invalid quantity", () => {
    const csv = `card_number,quantity
,2
OP01-001,0`;
    const result = parseCollectionCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.some((e) => e.includes("card_number is required"))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.includes("quantity"))).toBe(true);
  });

  it("rejects graded rows missing company/grade", () => {
    const csv = `card_number,quantity,is_graded
OP01-002,1,true`;
    const result = parseCollectionCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(
      result.errors.some((e) => e.includes("grading_company")),
    ).toBe(true);
  });

  it("handles quoted commas in notes", () => {
    const csv = `card_number,notes
OP01-001,"pulled from pack, keep"`;
    const result = parseCollectionCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.notes).toBe("pulled from pack, keep");
  });

  it("requires a header and at least one data row", () => {
    const result = parseCollectionCsv("card_number\n");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toMatch(/header row/i);
  });
});
