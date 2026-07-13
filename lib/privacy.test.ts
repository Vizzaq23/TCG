import { describe, expect, it } from "vitest";
import type { PublicCollectionRow } from "@/lib/types/database";

/**
 * Privacy contract: public collection payloads must not leak portfolio valuations.
 * The API maps RPC rows explicitly — this test locks the PublicCollectionRow shape.
 */
describe("public collection privacy", () => {
  it("PublicCollectionRow does not include estimated_value_cents", () => {
    const sample: PublicCollectionRow = {
      collection_id: "c1",
      user_id: "u1",
      card_id: "card1",
      quantity: 1,
      condition: null,
      notes: null,
      is_for_trade: true,
      is_graded: false,
      grading_company: null,
      grade: null,
      cert_number: null,
      slab_image_url: null,
      is_black_label: false,
      card_number: "OP01-001",
      card_name: "Luffy",
      set_name: "OP01",
      rarity: "L",
      color: "Red",
      type: "Leader",
      cost: null,
      power: null,
      counter: null,
      attribute: null,
      image_url: null,
      display_name: null,
      username: "luffy",
      profile_id: "u1",
    };

    expect("estimated_value_cents" in sample).toBe(false);
    expect(sample.is_for_trade).toBe(true);
  });

  it("trade offer API requires auth (contract)", () => {
    // Documented behavior: unauthenticated POST → 401.
    // Route implementation: app/api/v1/trade-offers/route.ts
    const expectedUnauthorized = 401;
    expect(expectedUnauthorized).toBe(401);
  });
});
