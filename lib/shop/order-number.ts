export function generateOrderNumber(now = new Date()): string {
  const stamp = now.getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OP-${stamp}-${rand}`;
}
