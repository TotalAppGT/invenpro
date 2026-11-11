export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/recurrente";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  try {
    const ok = await handleWebhookEvent(rawBody, svixId, svixTimestamp, svixSignature);
    return NextResponse.json({ received: true, ok }, { status: 200 });
  } catch (error) {
    console.error("Recurrente webhook error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
