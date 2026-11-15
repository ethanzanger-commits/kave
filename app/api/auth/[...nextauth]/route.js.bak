async function sendVerificationRequest({ identifier: email, url, provider }) {
  try {
    const transport = nodemailer.createTransport(provider.server);
    const result = await transport.sendMail({
      to: email,
      from: provider.from,
      subject: "Sign in to Kave",
      text: `Sign in to Kave: ${url}\n\n`,
      html: `<p>Click <a href="${url}">here</a> to sign in to Kave.</p>`,
    });
    const failed = result.rejected.concat(result.pending).filter(Boolean);
    if (failed.length) {
      throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
    }
  } catch (error) {
    console.error("SMTP Error in sendVerificationRequest:", error);
    throw new Error(`SendVerificationError: ${error.message}`);
  }
}
