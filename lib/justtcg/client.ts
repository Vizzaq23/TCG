import {
  JustTcgClientError,
  isJustTcgCard,
  isJustTcgGame,
  type JustTcgCard,
  type JustTcgGame,
  type JustTcgSet,
} from "@/lib/justtcg/types";

const BASE_URL = "https://api.justtcg.com/v1";
const DEFAULT_TIMEOUT_MS = 15_000;

export type JustTcgRequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
  code?: string;
};

function getApiKey(): string {
  const key = process.env.JUSTTCG_API_KEY?.trim();
  if (!key) {
    throw new JustTcgClientError("missing_api_key", "JUSTTCG_API_KEY is not set");
  }
  return key;
}

export function isJustTcgConfigured(): boolean {
  return Boolean(process.env.JUSTTCG_API_KEY?.trim());
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path.replace(/^\//, ""), `${BASE_URL}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url;
}

async function justTcgFetch<T>(
  path: string,
  init?: RequestInit & { params?: Record<string, string | number | boolean | undefined> },
  options?: JustTcgRequestOptions,
): Promise<T> {
  const apiKey = getApiKey();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  options?.signal?.addEventListener("abort", onAbort);

  try {
    const url = buildUrl(path, init?.params);
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new JustTcgClientError(
        "unauthorized",
        "JustTCG rejected the API key",
        res.status,
      );
    }
    if (res.status === 400) {
      throw new JustTcgClientError("bad_request", "JustTCG rejected the request", 400);
    }
    if (res.status === 429) {
      throw new JustTcgClientError("rate_limited", "JustTCG rate limit exceeded", 429);
    }
    if (!res.ok) {
      throw new JustTcgClientError(
        "http_error",
        `JustTCG HTTP ${res.status}`,
        res.status,
      );
    }

    const json = (await res.json()) as ApiEnvelope<T> | T;
    if (json && typeof json === "object" && "error" in json && (json as ApiEnvelope<T>).error) {
      const err = (json as ApiEnvelope<T>).error ?? "JustTCG error";
      if (/rate limit|429/i.test(err)) {
        throw new JustTcgClientError("rate_limited", err, 429);
      }
      throw new JustTcgClientError("http_error", err);
    }

    if (json && typeof json === "object" && "data" in json) {
      return (json as ApiEnvelope<T>).data as T;
    }
    return json as T;
  } catch (err) {
    if (err instanceof JustTcgClientError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new JustTcgClientError("timeout", "JustTCG request timed out");
    }
    throw new JustTcgClientError(
      "http_error",
      err instanceof Error ? err.message : "JustTCG request failed",
    );
  } finally {
    clearTimeout(timeout);
    options?.signal?.removeEventListener("abort", onAbort);
  }
}

export async function listGames(options?: JustTcgRequestOptions): Promise<JustTcgGame[]> {
  const data = await justTcgFetch<unknown>("games", undefined, options);
  if (!Array.isArray(data) || !data.every(isJustTcgGame)) {
    throw new JustTcgClientError("invalid_response", "Unexpected games payload");
  }
  return data;
}

export async function listSets(
  params?: { game?: string; limit?: number; offset?: number },
  options?: JustTcgRequestOptions,
): Promise<JustTcgSet[]> {
  const data = await justTcgFetch<unknown>("sets", { params }, options);
  if (!Array.isArray(data)) {
    throw new JustTcgClientError("invalid_response", "Unexpected sets payload");
  }
  return data as JustTcgSet[];
}

export type SearchCardsParams = {
  game?: string;
  query?: string;
  number?: string;
  set?: string;
  cardId?: string;
  tcgplayerId?: string;
  limit?: number;
  offset?: number;
  include_price_history?: boolean;
  include_null_prices?: boolean;
};

export async function searchCards(
  params: SearchCardsParams,
  options?: JustTcgRequestOptions,
): Promise<JustTcgCard[]> {
  const data = await justTcgFetch<unknown>(
    "cards",
    {
      params: {
        game: params.game,
        q: params.query,
        query: params.query,
        number: params.number,
        set: params.set,
        cardId: params.cardId,
        tcgplayerId: params.tcgplayerId,
        limit: params.limit ?? 10,
        offset: params.offset,
        include_price_history: params.include_price_history ?? false,
        include_null_prices: params.include_null_prices ?? true,
      },
    },
    options,
  );

  if (!Array.isArray(data)) {
    throw new JustTcgClientError("invalid_response", "Unexpected cards payload");
  }
  const cards = data.filter(isJustTcgCard);
  if (cards.length !== data.length) {
    // Tolerate partial shape drift but require at least id/name/variants on kept rows
  }
  return cards;
}

export async function getCardsByBatch(
  items: Array<{ cardId?: string; tcgplayerId?: string }>,
  options?: JustTcgRequestOptions,
): Promise<JustTcgCard[]> {
  const apiKey = getApiKey();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}/cards`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(
        items.map((item) => ({
          cardId: item.cardId,
          tcgplayerId: item.tcgplayerId,
          include_price_history: false,
        })),
      ),
    });

    if (res.status === 429) {
      throw new JustTcgClientError("rate_limited", "JustTCG rate limit exceeded", 429);
    }
    if (res.status === 401 || res.status === 403) {
      throw new JustTcgClientError("unauthorized", "JustTCG rejected the API key", res.status);
    }
    if (!res.ok) {
      throw new JustTcgClientError("http_error", `JustTCG HTTP ${res.status}`, res.status);
    }

    const json = (await res.json()) as ApiEnvelope<unknown> | unknown;
    const data =
      json && typeof json === "object" && "data" in json
        ? (json as ApiEnvelope<unknown>).data
        : json;
    if (!Array.isArray(data)) {
      throw new JustTcgClientError("invalid_response", "Unexpected batch cards payload");
    }
    return data.filter(isJustTcgCard);
  } catch (err) {
    if (err instanceof JustTcgClientError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new JustTcgClientError("timeout", "JustTCG request timed out");
    }
    throw new JustTcgClientError(
      "http_error",
      err instanceof Error ? err.message : "JustTCG batch request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}
