import { NextResponse } from "next/server";
import { procesarVencimientos } from "@/lib/vencimientos";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  if (secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const r = await procesarVencimientos();
  return NextResponse.json({ ok: true, ...r });
}
