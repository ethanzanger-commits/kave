const port = Number(process.env.SMTP_PORT || 465);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER || "resend", pass: process.env.SMTP_PASS },
});

export async function sendMail(to, subject, text) {
  if (!to || !process.env.SMTP_PASS) return false;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "kave <noreply@kavechats.com>",
      replyTo: process.env.REPLY_TO || undefined,
      to, subject, text, html: toHtml(text),
    });
    return true;
  } catch (e) {
    console.error("sendMail failed:", e.message);
    return false;
  }
}
