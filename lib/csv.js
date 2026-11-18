// Excel/Sheets-safe CSV: UTF-8 BOM, CRLF, formula-injection guard. Every file ends with an export timestamp column.
const esc = (v) => {
  let t = v == null ? "" : v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
};
export function toCsv(rows, cols, exportedAt = new Date()) {
  const head = [...cols, "exported_at"];
  const body = rows.map((r) => [...cols.map((c) => esc(r[c])), esc(exportedAt)].join(","));
  return "\uFEFF" + [head.join(","), ...body].join("\r\n") + "\r\n";
}
