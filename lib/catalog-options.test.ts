import { describe, expect, it } from "vitest";
import { toSetOptions } from "@/lib/catalog-options";

describe("toSetOptions", () => {
  it("moves set codes to the front and sorts options by code", () => {
    expect(
      toSetOptions([
        "WINGS OF THE CAPTAIN (OP-06)",
        "ROMANCE DAWN (OP-01)",
        "PARAMOUNT WAR (OP-02)",
      ]),
    ).toEqual([
      { value: "ROMANCE DAWN (OP-01)", label: "OP-01 — ROMANCE DAWN" },
      { value: "PARAMOUNT WAR (OP-02)", label: "OP-02 — PARAMOUNT WAR" },
      {
        value: "WINGS OF THE CAPTAIN (OP-06)",
        label: "OP-06 — WINGS OF THE CAPTAIN",
      },
    ]);
  });

  it("keeps the original value for filtering and places uncoded sets last", () => {
    expect(
      toSetOptions([
        "Promotion card",
        "THE AZURE SEA’S SEVEN (OP14-EB04)",
        "Promotion card",
        null,
      ]),
    ).toEqual([
      {
        value: "THE AZURE SEA’S SEVEN (OP14-EB04)",
        label: "OP14-EB04 — THE AZURE SEA’S SEVEN",
      },
      { value: "Promotion card", label: "Promotion card" },
    ]);
  });
});
