/**
 * WhatsApp Cloud API Integration
 * Plantilla: totalappgt_aviso (es_MX, UTILITY)
 * Parámetros: sistema + mensaje
 *
 * Environment variables:
 *   WHATSAPP_PHONE_ID      - Phone Number ID from Meta
 *   WHATSAPP_TOKEN         - Permanent access token
 *   WHATSAPP_VERIFY_TOKEN  - Webhook verification token
 *   WHATSAPP_TEMPLATE_NAME - Template name (default: totalappgt_aviso)
 */

const WHATSAPP_API_BASE = "https://graph.facebook.com/v22.0";
const TEMPLATE_NOMBRE = process.env.WHATSAPP_TEMPLATE_NAME || "totalappgt_aviso";
const TEMPLATE_LANG = "es_MX";
const SISTEMA_NOMBRE = "InvenPro";

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
  return phone.replace(/\D/g, "");
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

function logMessage(phone: string, sistema: string, mensaje: string, result: WhatsAppMessageResult): void {
  const timestamp = new Date().toISOString();
  const status = result.success ? "SUCCESS" : "FAILED";
  console.log(
    `[WhatsApp ${timestamp}] ${status} | To: ${phone} | Sistema: ${sistema} | Msg: ${mensaje.substring(0, 80)} | ID: ${result.messageId || "N/A"} | Error: ${result.error || "N/A"}`
  );
}

async function postWhatsApp(payload: Record<string, unknown>) {
  const phoneId = getPhoneId();
  const token = getToken();
  const url = `${WHATSAPP_API_BASE}/${phoneId}/messages`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function enviarPlantillaAlerta(
  telefono: string,
  sistema: string,
  mensaje: string
): Promise<WhatsAppMessageResult> {
  try {
    await rateLimitedRequest();

    const res = await postWhatsApp({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(telefono),
      type: "template",
      template: {
        name: TEMPLATE_NOMBRE,
        language: { code: TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", parameter_name: "sistema", text: sistema },
              { type: "text", parameter_name: "mensaje", text: mensaje },
            ],
          },
        ],
      },
    });

    const data = await res.json();
    const result: WhatsAppMessageResult = {
      success: res.ok,
      statusCode: res.status,
    };

    if (res.ok && data.messages?.[0]?.id) {
      result.messageId = data.messages[0].id;
    }
    if (!res.ok) {
      result.error = data.error?.message || `HTTP ${res.status}`;
    }

    logMessage(telefono, sistema, mensaje, result);
    return result;
  } catch (err) {
    const result: WhatsAppMessageResult = {
      success: false,
      error: err instanceof Error ? err.message : "Error al enviar WhatsApp",
    };
    logMessage(telefono, SISTEMA_NOMBRE, mensaje, result);
    return result;
  }
}

// ─── Helpers usando la plantilla real ───

export async function sendWhatsAppMessage(
  phone: string,
  _template: string,
  params: string[]
): Promise<WhatsAppMessageResult> {
  const mensaje = params.length >= 2 ? params[1] : params[0] || "";
  return enviarPlantillaAlerta(phone, SISTEMA_NOMBRE, mensaje);
}

export async function sendStockAlert(
  phone: string,
  producto: string,
  cantidad: number,
  bodega: string
): Promise<WhatsAppMessageResult> {
  const mensaje = `ALERTA STOCK BAJO: ${producto} tiene solo ${cantidad} unidades en ${bodega}. Reabastecer.`;
  return enviarPlantillaAlerta(phone, SISTEMA_NOMBRE, mensaje);
}

export async function sendAlertaVencimiento(
  phone: string,
  producto: string,
  fecha: string
): Promise<WhatsAppMessageResult> {
  const mensaje = `VENCIMIENTO: El producto ${producto} vence el ${fecha}. Revisar inventario.`;
  return enviarPlantillaAlerta(phone, SISTEMA_NOMBRE, mensaje);
}

export async function sendNotification(
  phone: string,
  mensaje: string
): Promise<WhatsAppMessageResult> {
  return enviarPlantillaAlerta(phone, SISTEMA_NOMBRE, mensaje);
}

export { getPhoneId, getToken, SISTEMA_NOMBRE, TEMPLATE_NOMBRE };
