import { getJourneyEntries } from "@/lib/journey/archive";
import { ENCOUNTER_MAX_BODY_BYTES, parseEncounterInput, selectJourneyEncounter } from "@/lib/journey/encounter";

const headers = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
const invalid = () => Response.json({ error: "Send a JSON object with an optional current card ID and at most 1000 seen card IDs." }, { status: 400, headers });
const tooLarge = () => Response.json({ error: "Encounter requests must not exceed 64 KiB." }, { status: 413, headers });

export async function POST(request: Request) {
  const advertisedLength = request.headers.get("content-length");
  if (advertisedLength && /^\d+$/.test(advertisedLength) && Number(advertisedLength) > ENCOUNTER_MAX_BODY_BYTES) return tooLarge();
  if (!request.body) return invalid();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > ENCOUNTER_MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return tooLarge();
      }
      chunks.push(value);
    }
  } catch {
    return invalid();
  } finally {
    reader.releaseLock();
  }

  let input;
  try {
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    input = parseEncounterInput(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)));
  } catch {
    return invalid();
  }
  if (!input) return invalid();
  return Response.json(selectJourneyEncounter(getJourneyEntries(), input), { headers });
}
