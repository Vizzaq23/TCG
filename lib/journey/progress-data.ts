/** Validate device-local progress without bundling the full catalog in the browser. */
export function parseJourneyProgress(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string =>
      typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.!+\-]{0,99}$/.test(id)
    ))].slice(0,20000);
  } catch { return []; }
}
