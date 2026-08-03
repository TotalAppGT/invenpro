/**
 * WhatsApp Cloud API Integration
 * Uses Meta's WhatsApp Cloud API v22.0
 *
 * Environment variables required:
 *   WHATSAPP_PHONE_ID  - The Phone Number ID from Meta Business App
 *   WHATSAPP_TOKEN     - Permanent access token from Meta
 *   WHATSAPP_VERIFY_TOKEN - Token for webhook verification (arbitrary string you set)
 */

const WHATSAPP_API_BASE = "https://graph.facebook.com/v22.0";

let requestCount = 0;
let requestWindowStart = Date.now();
const MAX_REQUESTS_PER_SECOND = 5;

function getPhoneId(): string {
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!id) {
    throw new Error("WHATSAPP_PHONE_ID environment variable is not configured");
  }
  return id;
}

function getToken(): string {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    throw new Error("WHATSAPP_TOKEN environment variable is not configured");
  }
  return token;
}

function getVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || "invenpro_webhook_verify_token";
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

async function rateLimitedRequest(): Promise<void> {
  const now = Date.now();
  if (now - requestWindowStart >= 1000) {
    requestCount = 0;
    requestWindowStart = now;
  }
  if (requestCount >= MAX_REQUESTS_PER_SECOND) {
    const waitMs = 1000 - (now - requestWindowStart) + 50;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    requestCount = 0;
    requestWindowStart = Date.now();
  }
  requestCount++;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface WhatsAppTemplateParam {
  type: "text" | "currency" | "date_time";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

function logMessage(phone: string, template: string, params: string[], result: WhatsAppMessageResult): void {
  const timestamp = new Date().toISOString();
  const status = result.success ? "SUCCESS" : "FAILED";
  const messageId = result.messageId || "N/A";
  const error = result.error || "N/A";

  console.log(
    `[WhatsApp ${timestamp}] ${status} | To: ${phone} | Template: ${template} | Params: [${params.join(", ")}] | MessageID: ${messageId} | Error: ${error}`
  );
}

export async function sendWhatsAppMessage(
  phoneNumber: string,
  templateName: string,
  params: string[]
): Promise<WhatsAppMessageResult> {
  try {
    const phoneId = getPhoneId();
    const token = getToken();
    const normalizedPhone = normalizePhone(phoneNumber);

    const components: {
      type: string;
      parameters: { type: string; text: string }[];
    }[] = [];

    if (params.length > 0) {
      components.push({
        type: "body",
        parameters: params.map((p) => ({ type: "text", text: p })),
      });
    }

    await rateLimitedRequest();

    const response = await fetch(`${WHATSAPP_API_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "es" },
          components: components.length > 0 ? components : undefined,
        },
      }),
    });

    const data = await response.json();

    const result: WhatsAppMessageResult = {
      success: response.ok,
      statusCode: response.status,
    };

    if (response.ok && data.messages?.[0]?.id) {
      result.messageId = data.messages[0].id;
    }

    if (!response.ok) {
      result.error = data.error?.message || data.error?.error_user_msg || `HTTP ${response.status}`;
    }

    logMessage(normalizedPhone, templateName, params, result);
    return result;
  } catch (err) {
    const result: WhatsAppMessageResult = {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido al enviar mensaje de WhatsApp",
    };
    logMessage(phoneNumber, templateName, params, result);
    return result;
  }
}

export async function sendStockAlert(
  phone: string,
  producto: string,
  cantidad: number,
  bodega: string
): Promise<WhatsAppMessageResult> {
  return sendWhatsAppMessage(phone, "stock_alert", [producto, String(cantidad), bodega]);
}

export async function sendNotification(
  phone: string,
  mensaje: string
): Promise<WhatsAppMessageResult> {
  const phoneId = getPhoneId();
  const token = getToken();
  const normalizedPhone = normalizePhone(phone);

  try {
    await rateLimitedRequest();

    const response = await fetch(`${WHATSAPP_API_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: mensaje,
        },
      }),
    });

    const data = await response.json();

    const result: WhatsAppMessageResult = {
      success: response.ok,
      statusCode: response.status,
    };

    if (response.ok && data.messages?.[0]?.id) {
      result.messageId = data.messages[0].id;
    }

    if (!response.ok) {
      result.error = data.error?.message || `HTTP ${response.status}`;
    }

    logMessage(normalizedPhone, "text_message", [mensaje], result);
    return result;
  } catch (err) {
    const result: WhatsAppMessageResult = {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    };
    logMessage(phone, "text_message", [mensaje], result);
    return result;
  }
}

export { getPhoneId, getToken, getVerifyToken, normalizePhone };
