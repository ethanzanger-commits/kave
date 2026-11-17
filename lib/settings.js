export async function reminderCfg(q) {
  const m = Object.fromEntries((await q`select key, value from setting`).map((r) => [r.key, r.value]));
  return { paused: m.reminders_paused === "1", h1: Number(m.h1 || 1), h2: Number(m.h2 || 24), h3: Number(m.h3 || 72) };
}
