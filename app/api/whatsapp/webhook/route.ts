export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getVerifyToken } from "@/lib/whatsapp";

interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

interface WhatsAppChangeValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  statuses?: {
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }[];
  messages?: {
    from: string;
    id: string;
    timestamp: string;
    type: string;
    text?: { body: string };
    interactive?: unknown;
  }[];
  contacts?: {
    profile: { name: string };
    wa_id: string;
  }[];
}

interface WhatsAppStatusChange {
  field: string;
  value: WhatsAppChangeValue;
}

function log(name: string, data: unknown): void {
  const timestamp = new Date().toISOString();
  console.log(`=== [WhatsApp Webhook ${timestamp}] ${name} ===`);

  try {
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log(String(data));
  }

  console.log("=" .repeat(80));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = getVerifyToken();

    log("WEBHOOK_VERIFICATION", { mode, token, verifyToken });

    if (mode === "subscribe" && token === verifyToken) {
      log("WEBHOOK_VERIFIED", "Webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    }

    log("WEBHOOK_VERIFICATION_FAILED", { reason: "Token mismatch or invalid mode" });
    return new NextResponse("Verification failed", { status: 403 });
  } catch (error) {
    log("WEBHOOK_VERIFICATION_ERROR", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    log("INCOMING_WEBHOOK", body);

    if (body.object !== "whatsapp_business_account") {
      log("UNKNOWN_OBJECT", { object: body.object });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value as WhatsAppChangeValue;

        if (value.messages && value.messages.length > 0) {
          for (const msg of value.messages) {
            const messageData: WhatsAppIncomingMessage = {
              from: msg.from,
              id: msg.id,
              timestamp: msg.timestamp,
              type: msg.type,
              text: msg.text,
            };

            log("INCOMING_MESSAGE", {
              phoneNumberId: value.metadata?.phone_number_id,
              contact: value.contacts?.[0],
              message: messageData,
            });

            if (msg.text?.body) {
              log("MESSAGE_BODY", {
                from: msg.from,
                body: msg.text.body,
                type: msg.type,
              });
            }
          }
        }

        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            log("MESSAGE_STATUS", {
              id: status.id,
              status: status.status,
              recipient: status.recipient_id,
              timestamp: status.timestamp,
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    log("WEBHOOK_ERROR", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
