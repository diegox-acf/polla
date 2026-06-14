import { syncResults } from "@/lib/sync";

// Lo dispara el workflow .github/workflows/sync-results.yml cada ~10 min
// (Vercel Hobby limita su cron a 1 vez/día). El workflow manda el header
// "Authorization: Bearer <CRON_SECRET>"; el cron diario de Vercel también lo
// envía automáticamente cuando CRON_SECRET está definido como env var.
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
