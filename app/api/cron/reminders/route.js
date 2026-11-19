import { runReminders } from "@/lib/reminders";
export const maxDuration = 60;
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("no", { status: 401 });
  const base = process.env.APP_URL || "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return Response.json(await runReminders(base));
}
