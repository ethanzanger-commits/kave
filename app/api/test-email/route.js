import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Verify connection configuration
    await transporter.verify();

    return NextResponse.json({ success: true, message: "SMTP connection verified successfully!" });
  } catch (error) {
    console.error("SMTP Test Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
