/**
 * WhatsApp Cloud API Integration
 * Plantilla: notificacion_sistema_ia (es_MX, 2 params: nombre + mensaje)
 *
 * Environment variables:
 *   WHATSAPP_PHONE_ID     - Phone Number ID from Meta
 *   WHATSAPP_TOKEN        - Permanent access token
 *   WHATSAPP_VERIFY_TOKEN - Webhook verification token
 *   WHATSAPP_TEMPLATE_NAME - Template name (default: notificacion_sistema_ia)
 */

const WHATSAPP_API_BASE = "https://graph.facebook.com/v22.0";
const DEFAULT_TEMPLATE = process.env.WHATSAPP_TEMPLATE_NAME || "notificacion_sistema_ia";

let requestCount = 0;
let requestWindowStart = Date.now();
const MAX_REQUESTS_PER_SECOND = 5;

function getPhoneId(): string {
  const id = process.env.WHATSAPP_PHONE_ID;
  if (!id) throw new Error("WHATSAPP_PHONE_ID no configurado");
  return id;
}

function getToken(): string {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN no configurado");
  return token;
}

export function getVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || "totalappgt_proxy_2026";
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("00")) cleaned = "+" + cleaned.slice(2);
  if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
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

function logMessage(phone: string, template: string, params: string[], result: WhatsAppMessageResult): void {
  const timestamp = new Date().toISOString();
  const status = result.success ? "SUCCESS" : "FAILED";
  console.log(
    `[WhatsApp ${timestamp}] ${status} | To: ${phone} | Template: ${template} | Params: [${params.join(", ")}] | ID: ${result.messageId || "N/A"} | Error: ${result.error || "N/A"}`
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

    const components: { type: string; parameters: { type: string; text: string }[] }[] = [];
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
          language: { code: "es_MX" },
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
      result.error = data.error?.message || `HTTP ${response.status}`;
    }

    logMessage(normalizedPhone, templateName, params, result);
    return result;
  } catch (err) {
    const result: WhatsAppMessageResult = {
      success: false,
      error: err instanceof Error ? err.message : "Error al enviar WhatsApp",
    };
    logMessage(phoneNumber, templateName, params, result);
    return result;
  }
}

// ─── Helpers usando la plantilla real ───

export async function sendStockAlert(
  phone: string,
  producto: string,
  cantidad: number,
  bodega: string
): Promise<WhatsAppMessageResult> {
  const mensaje = `ALERTA: ${producto} tiene solo ${cantidad} unidades en ${bodega}. Reabastecer.`;
  return sendWhatsAppMessage(phone, DEFAULT_TEMPLATE, [producto, mensaje]);
}

export async function sendAlertaVencimiento(
  phone: string,
  producto: string,
  fecha: string
): Promise<WhatsAppMessageResult> {
  const mensaje = `El producto ${producto} vence el ${fecha}. Revisar inventario.`;
  return sendWhatsAppMessage(phone, DEFAULT_TEMPLATE, [producto, mensaje]);
}

export async function sendNotification(
  phone: string,
  mensaje: string
): Promise<WhatsAppMessageResult> {
  return sendWhatsAppMessage(phone, DEFAULT_TEMPLATE, ["InvenPro", mensaje]);
}

export { getPhoneId, getToken, DEFAULT_TEMPLATE };
