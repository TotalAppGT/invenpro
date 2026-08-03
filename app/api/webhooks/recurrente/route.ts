import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/recurrente";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("recurrente-signature") ?? "";

  try {
    await handleWebhookEvent(rawBody, signature);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Recurrente webhook error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
