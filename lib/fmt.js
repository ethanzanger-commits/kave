export const fmt = (w) => { const d = new Date(w); return isNaN(d) ? w : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
export const gcal = (m) => { const p = (d) => d.toISOString().slice(0, 19).replace(/[-:]/g, ""); const s = new Date(m.when + "Z"); if (isNaN(s)) return null;
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Coffee on kave") + "&dates=" + p(s) + "/" + p(new Date(+s + 36e5)) + "&location=" + encodeURIComponent(m.place || ""); };
