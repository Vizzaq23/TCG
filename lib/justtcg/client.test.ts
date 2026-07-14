import { afterEach, describe, expect, it, vi } from "vitest";
import { JustTcgClientError } from "@/lib/justtcg/types";
import { isJustTcgConfigured, searchCards } from "@/lib/justtcg/client";

describe("JustTCG client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reports configured only when key is set", () => {
    vi.stubEnv("JUSTTCG_API_KEY", "");
    expect(isJustTcgConfigured()).toBe(false);
    vi.stubEnv("JUSTTCG_API_KEY", "test-key");
    expect(isJustTcgConfigured()).toBe(true);
  });

  it("rejects missing API key", async () => {
    vi.stubEnv("JUSTTCG_API_KEY", "");
    await expect(searchCards({ query: "Luffy" })).rejects.toMatchObject({
      code: "missing_api_key",
    } satisfies Partial<JustTcgClientError>);
  });

  it("maps non-200 responses to typed errors", async () => {
    vi.stubEnv("JUSTTCG_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    await expect(searchCards({ query: "Luffy" })).rejects.toMatchObject({
      code: "http_error",
      status: 500,
    });
  });

  it("maps 429 to rate_limited", async () => {
    vi.stubEnv("JUSTTCG_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("slow down", { status: 429 })),
    );
    await expect(searchCards({ query: "Luffy" })).rejects.toMatchObject({
      code: "rate_limited",
      status: 429,
    });
  });

  it("maps abort/timeout", async () => {
    vi.stubEnv("JUSTTCG_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );
    await expect(searchCards({ query: "Luffy" }, { timeoutMs: 1 })).rejects.toMatchObject({
      code: "timeout",
    });
  });
});
