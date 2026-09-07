import { getJourneyArchive } from "@/lib/journey/archive";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = getJourneyArchive({
    q: params.get("q") ?? undefined,
    set: params.get("set") ?? undefined,
    type: params.get("type") ?? undefined,
    language: params.get("language") ?? undefined,
    order: params.get("order") ?? undefined,
    page: params.get("page") ?? undefined,
    card: params.get("card") ?? undefined,
  });
  return Response.json(result, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
