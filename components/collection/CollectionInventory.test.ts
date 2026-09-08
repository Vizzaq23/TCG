// @vitest-environment happy-dom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionInventory } from "./CollectionInventory";
import type { CollectionRowData } from "./CollectionRow";

type DeleteResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  deleteRow: vi.fn<(id: string) => Promise<DeleteResult>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table !== "user_collections") throw new Error(`Unexpected table: ${table}`);
      return {
        delete: () => ({
          eq: (column: string, id: string) => {
            if (column !== "id") throw new Error("Delete must target the collection entry ID");
            return {
              select: () => ({ single: () => mocks.deleteRow(id) }),
            };
          },
        }),
      };
    },
  }),
}));

// Animation and pointer effects are unrelated to collection state.
vi.mock("@/components/cards/GradedSlab", () => ({
  GradedSlab: () => null,
}));

function collectionRow(id: string, name: string, overrides: Partial<CollectionRowData> = {}): CollectionRowData {
  return {
    id,
    user_id: "collector",
    card_id: `card-${id}`,
    quantity: 1,
    condition: "Near Mint",
    notes: null,
    is_for_trade: false,
    showcase_slot: null,
    is_graded: false,
    grading_company: null,
    grade: null,
    cert_number: null,
    slab_image_url: null,
    is_black_label: false,
    estimated_value_cents: null,
    created_at: "2026-09-07T00:00:00.000Z",
    updated_at: "2026-09-07T00:00:00.000Z",
    cards: {
      id: `card-${id}`,
      card_number: "OP01-001",
      name,
      set_name: "Romance Dawn (OP-01)",
      rarity: "Leader",
      color: "Red",
      type: "Leader",
      cost: null,
      power: "5000",
      counter: null,
      attribute: null,
      image_url: null,
      market_price_cents: null,
      market_price_updated_at: null,
      justtcg_card_id: null,
      justtcg_set_id: null,
      tcgplayer_product_id: null,
      created_at: "2026-09-07T00:00:00.000Z",
    },
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("collection removal", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.refresh.mockReset();
    mocks.deleteRow.mockReset();
    mocks.deleteRow.mockImplementation(async (id) => ({ data: { id }, error: null }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function render(rows: CollectionRowData[]) {
    await act(async () => {
      root.render(createElement(CollectionInventory, { rows, error: null }));
    });
  }

  function entries() {
    return [...container.querySelectorAll("li")];
  }

  function removeButton(entry: Element) {
    const button = [...entry.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Remove",
    );
    if (!button) throw new Error("Collection entry is missing its Remove button");
    return button;
  }

  async function remove(entry: Element) {
    await act(async () => { removeButton(entry).click(); });
  }

  it("removes a confirmed entry and showcase choices without waiting for the route refresh", async () => {
    const deletion = deferred<DeleteResult>();
    mocks.deleteRow.mockReturnValueOnce(deletion.promise);
    await render([
      collectionRow("luffy", "Monkey.D.Luffy", { showcase_slot: 1 }),
      collectionRow("zoro", "Roronoa Zoro"),
    ]);

    await remove(entries()[0]);
    expect(entries()).toHaveLength(2);
    expect(entries()[0].textContent).toContain("Removing…");
    expect([...entries()[0].querySelectorAll("button")].every((button) => button.disabled)).toBe(true);
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => { deletion.resolve({ data: { id: "luffy" }, error: null }); });

    // The mocked refresh deliberately supplies no new server props.
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(entries()).toHaveLength(1);
    expect(entries()[0].textContent).toContain("Roronoa Zoro");
    expect(container.textContent).not.toContain("Monkey.D.Luffy");
    expect(container.querySelector('option[value="luffy"]')).toBeNull();
    expect(container.querySelector('option[value="zoro"]')).not.toBeNull();
  });

  it("shows the empty collection and removes the showcase when the last entry is deleted", async () => {
    await render([collectionRow("luffy", "Monkey.D.Luffy", { showcase_slot: 1 })]);
    await remove(entries()[0]);

    expect(entries()).toHaveLength(0);
    expect(container.textContent).toContain("You have not added any cards yet");
    expect(container.textContent).not.toContain("Collector's Showcase");
    expect(container.querySelector('a[href="/browse"]')).not.toBeNull();
  });

  it("does not resurrect a deleted entry when stale server props arrive", async () => {
    const original = [collectionRow("luffy", "Monkey.D.Luffy"), collectionRow("zoro", "Roronoa Zoro")];
    await render(original);
    await remove(entries()[0]);
    await render(original.map((row) => ({ ...row })));

    expect(entries()).toHaveLength(1);
    expect(container.textContent).not.toContain("Monkey.D.Luffy");

    await render([original[1], collectionRow("nami", "Nami")]);
    expect(entries()).toHaveLength(2);
    expect(container.textContent).toContain("Nami");
    expect(container.textContent).not.toContain("Monkey.D.Luffy");
  });

  it("preserves a separate graded entry for the same underlying card", async () => {
    const raw = collectionRow("raw-luffy", "Monkey.D.Luffy");
    const graded = collectionRow("graded-luffy", "Monkey.D.Luffy", {
      card_id: raw.card_id,
      cards: raw.cards,
      is_graded: true,
      grading_company: "PSA",
      grade: 10,
    });
    await render([raw, graded]);
    await remove(entries()[0]);

    expect(mocks.deleteRow).toHaveBeenCalledWith("raw-luffy");
    expect(entries()).toHaveLength(1);
    expect(entries()[0].textContent).toContain("PSA");
    expect(container.querySelector('option[value="graded-luffy"]')).not.toBeNull();
    expect(container.querySelector('option[value="raw-luffy"]')).toBeNull();
  });

  it("keeps the entry when the confirmation is cancelled", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await render([collectionRow("luffy", "Monkey.D.Luffy")]);
    await remove(entries()[0]);

    expect(entries()).toHaveLength(1);
    expect(removeButton(entries()[0]).disabled).toBe(false);
    expect(mocks.deleteRow).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ["database error", { data: null, error: { message: "Permission denied" } }],
    ["no deleted entry", { data: null, error: null }],
    ["different returned entry", { data: { id: "different-entry" }, error: null }],
  ] satisfies [string, DeleteResult][])("keeps the entry and allows retry after %s", async (_name, result) => {
    mocks.deleteRow.mockResolvedValueOnce(result);
    await render([collectionRow("luffy", "Monkey.D.Luffy")]);
    await remove(entries()[0]);

    expect(entries()).toHaveLength(1);
    expect(removeButton(entries()[0]).disabled).toBe(false);
    expect(mocks.refresh).not.toHaveBeenCalled();

    await remove(entries()[0]);
    expect(entries()).toHaveLength(0);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the entry and shows the error if the delete request throws", async () => {
    mocks.deleteRow.mockRejectedValueOnce(new Error("Network unavailable"));
    await render([collectionRow("luffy", "Monkey.D.Luffy")]);
    await remove(entries()[0]);

    expect(entries()).toHaveLength(1);
    expect(removeButton(entries()[0]).disabled).toBe(false);
    expect(container.textContent).toContain("Could not remove this card. Check your connection and try again.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("preserves both removals when two delete requests finish out of order", async () => {
    const first = deferred<DeleteResult>();
    const second = deferred<DeleteResult>();
    mocks.deleteRow.mockImplementation((id) => id === "luffy" ? first.promise : second.promise);
    await render([collectionRow("luffy", "Monkey.D.Luffy"), collectionRow("zoro", "Roronoa Zoro")]);
    await remove(entries()[0]);
    await remove(entries()[1]);

    await act(async () => { second.resolve({ data: { id: "zoro" }, error: null }); });
    expect(entries()).toHaveLength(1);
    expect(entries()[0].textContent).toContain("Monkey.D.Luffy");

    await act(async () => { first.resolve({ data: { id: "luffy" }, error: null }); });
    expect(entries()).toHaveLength(0);
    expect(container.textContent).toContain("You have not added any cards yet");
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });
});
