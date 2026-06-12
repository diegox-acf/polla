import { syncResults } from "@/lib/sync";

// Vercel Cron envía "Authorization: Bearer <CRON_SECRET>" automáticamente
// cuando CRON_SECRET está definido como env var del proyecto.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await syncResults();
    return Response.json(summary);
  } catch (error) {
    console.error("[cron/sync]", error);
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
