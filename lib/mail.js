import nodemailer from "nodemailer";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Turns plain text into the branded HTML email. "LABEL IN CAPS: https://..." on its own becomes a button.
export function toHtml(text) {
  const blocks = String(text).split(/\n{2,}/).map((b) => {
    const m = b.trim().match(/^([A-Z][A-Z' \-]{3,}):\s*(https?:\/\/\S+)$/);
    if (m) return `<p style="margin:24px 0"><a href="${esc(m[2])}" style="background:#101b33;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:600;display:inline-block">${esc(m[1][0] + m[1].slice(1).toLowerCase())}</a></p>`;
    return `<p style="margin:0 0 16px;line-height:1.6">${esc(b.trim()).replace(/\n/g, "<br>").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#101b33">$1</a>')}</p>`;
  }).join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f0e4;font-family:'DM Sans',Arial,sans-serif;color:#101b33"><div style="max-width:520px;margin:0 auto;padding:32px 20px"><div style="font:700 24px Georgia,serif;margin-bottom:24px">kave<span style="color:#e8590c">.</span></div><div style="background:#ffffff;border:1px solid #d8d0bd;border-radius:16px;padding:28px">${blocks}</div><p style="color:#58617a;font-size:12px;line-height:1.5;margin:20px 4px">Kave introduces professionals across Israel over coffee. You are receiving this because you have a Kave account or asked for a sign-in link.</p></div></body></html>`;
}
// Uses SMTP_* (for example Brevo with your own domain) if set, otherwise the Gmail account.
const smtp = () => (process.env.SMTP_HOST
  ? { ok: process.env.SMTP_USER && process.env.SMTP_PASS, t: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } }
  : { ok: process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD, t: { host: "smtp.gmail.com", port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } } });
export async function sendMail(to, subject, text) {
  const c = smtp(); if (!c.ok || !to) return false;
  try {
    await nodemailer.createTransport(c.t).sendMail({ from: process.env.EMAIL_FROM || process.env.GMAIL_USER, replyTo: process.env.REPLY_TO || undefined, to, subject, text, html: toHtml(text) });
    return true;
  } catch { return false; }
}
