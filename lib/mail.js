export async function sendMail(to, subject, text) {
  const k = process.env.AUTH_RESEND_KEY; if (!k || !to) return;
  try { await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }) }); } catch {}
}
