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

type LogLevel = "debug" | "info" | "warn" | "error";
const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "warn";

function log(level: LogLevel, message: string, data?: unknown): void {
  if (LEVELS[level] < LEVELS[CURRENT_LEVEL]) return;
  const line = `[whatsapp-webhook] ${level.toUpperCase()} ${message}`;
  if (data === undefined) {
    console.log(line);
  } else {
    console.log(line, typeof data === "string" ? data : JSON.stringify(data));
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    const verifyToken = getVerifyToken();

    if (mode === "subscribe" && token === verifyToken) {
      log("info", "verificación correcta");
      return new NextResponse(challenge, { status: 200 });
    }

    log("warn", "verificación fallida", { mode });
    return new NextResponse("Verification failed", { status: 403 });
  } catch (error) {
    log("error", "error en verificación", error instanceof Error ? error.message : String(error));
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== "whatsapp_business_account") {
      log("debug", "objeto desconocido", { object: body.object });
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
            log("info", "mensaje entrante", {
              phoneNumberId: value.metadata?.phone_number_id,
              contact: value.contacts?.[0]?.wa_id,
              message: messageData,
            });
          }
        }

        // Los estados de entrega son de altísimo volumen: solo en debug.
        if (value.statuses && value.statuses.length > 0) {
          log("debug", "estados de entrega", {
            count: value.statuses.length,
            statuses: value.statuses.map((s) => ({ id: s.id, status: s.status })),
          });
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    log("error", "error procesando webhook", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
