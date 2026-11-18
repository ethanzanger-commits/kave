// Strict, ASCII-only address check for anything that becomes a mail recipient.
// Rejects quotes, comments, groups, angle brackets, commas, spaces and look-alike (non-ASCII) characters.
export function cleanEmail(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s.length > 254 || !/^[a-z0-9._%+\-]{1,64}@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/.test(s)) return null;
  return s;
}
