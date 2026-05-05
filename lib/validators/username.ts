export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

export function isValidUsername(normalized: string) {
  return USERNAME_RE.test(normalized);
}
