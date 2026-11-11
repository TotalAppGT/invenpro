import { createHmac } from "crypto";
import { prisma } from "./prisma";
import { extenderVigencia } from "./vencimientos";
import type { Plan } from "@prisma/client";

const RECURRENTE_BASE_URL = "https://app.recurrente.com/api";

interface RecurrenteClient {
  baseUrl: string;
  secretKey: string;
}

export function createRecurrenteClient(): RecurrenteClient {
  return {
    baseUrl: RECURRENTE_BASE_URL,
    secretKey: process.env.RECURRENTE_SECRET_KEY!,
  };
}

export const recurrente = createRecurrenteClient();

export const PLAN_AMOUNTS: Record<Plan, { monthly: number; yearly: number }> = {
  EMPRENDEDOR: { monthly: 14900, yearly: 199000 },
  NEGOCIO: { monthly: 34900, yearly: 349000 },
  CORPORATIVO: { monthly: 79900, yearly: 799000 },
};

const PLAN_LABELS: Record<Plan, string> = {
  EMPRENDEDOR: "Plan Emprendedor",
  NEGOCIO: "Plan Negocio",
  CORPORATIVO: "Plan Corporativo",
};

async function recurrenteFetch(
  client: RecurrenteClient,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${client.baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-SECRET-KEY": client.secretKey,
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Recurrente API error ${response.status}: ${errorBody}`);
  }

  return response;
}

interface CreateCheckoutSessionParams {
  tenantId: string;
  plan: Plan;
  billingInterval: "monthly" | "yearly";
  customerEmail: string;
  tenantName: string;
  amountInCents?: number;
  cupon?: string | null;
}

export async function createCheckoutSession({
  tenantId,
  plan,
  billingInterval,
  customerEmail,
  tenantName,
  amountInCents: amountOverride,
  cupon,
}: CreateCheckoutSessionParams): Promise<{ id: string; url: string }> {
  const amounts = PLAN_AMOUNTS[plan];
  if (!amounts) {
    throw new Error(`No amount configured for plan ${plan}`);
  }

  const amountInCents =
    typeof amountOverride === "number"
      ? Math.max(0, amountOverride)
      : billingInterval === "monthly"
        ? amounts.monthly
        : amounts.yearly;
  const planLabel = PLAN_LABELS[plan];
  const intervalLabel = billingInterval === "monthly" ? "Mensual" : "Anual";

  const body = {
    items: [
      {
        name: `${planLabel} - ${intervalLabel}`,
        amount_in_cents: amountInCents,
        quantity: 1,
      },
    ],
    metadata: {
      tenantId,
      plan,
      billingInterval,
      tenantName,
      ...(cupon ? { cupon } : {}),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion?checkout=canceled`,
  };

  const response = await recurrenteFetch(recurrente, "/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { id: data.id, url: data.checkout_url || data.url };
}

export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<{
  status: string;
  active: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}> {
  try {
    const response = await recurrenteFetch(
      recurrente,
      `/subscriptions/${subscriptionId}`
    );
    const subscription = await response.json();
    return {
      status: subscription.status,
      active: subscription.status === "active" || subscription.status === "trialing",
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch {
    return { status: "unknown", active: false };
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<void> {
  await recurrenteFetch(
    recurrente,
    `/subscriptions/${subscriptionId}/cancel`,
    { method: "POST" }
  );
}

function verifySvix(payload: string, id: string, ts: string, sig: string, secret: string): boolean {
  if (!secret || !id || !ts || !sig) return false;
  const ahora = Math.floor(Date.now() / 1000);
  if (Math.abs(ahora - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${payload}`).digest("base64");
  return sig.split(" ").some((part) => {
    const [v, h] = part.split(",");
    return v === "v1" && h === expected;
  });
}

export async function handleWebhookEvent(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string
): Promise<boolean> {
  const webhookSecret = process.env.RECURRENTE_WEBHOOK_SECRET || "";
  if (!verifySvix(payload, svixId, svixTimestamp, svixSignature, webhookSecret)) {
    console.error("Recurrente webhook: firma invalida");
    return false;
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return false;
  }

  const eventType = String(event.event_type || event.type || "");
  const data = event.data || {};
  const meta = data.metadata || data.checkout?.metadata || event.metadata || {};
  const tenantId = meta.tenantId || meta.tenant_id;
  const plan = meta.plan;

  const estado = String(data.status || data.checkout?.status || "").toLowerCase();
  const inactivo = /fail|cancel|refund|unpaid|past_due/.test(eventType.toLowerCase()) ||
    ["failed", "cancelled", "canceled", "unpaid", "past_due"].includes(estado);
  const activo = /succeed|complete|paid|active|created|updated|renew/i.test(eventType) ||
    ["paid", "succeeded", "completed", "active"].includes(estado);

  try {
    if (tenantId && activo && !inactivo) {
      const cicloRaw = String(meta.billingInterval || meta.ciclo || "monthly").toLowerCase();
      const ciclo = cicloRaw === "yearly" || cicloRaw === "anual" ? "anual" : "mensual";
      await extenderVigencia(tenantId, ciclo, plan);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          recurrenteSubscriptionId: data.subscription_id || data.subscription?.id || data.id || undefined,
        },
      });
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          include: { users: { where: { rol: "ADMIN" }, take: 1 } },
        });
        const adminUser = tenant?.users[0];
        if (adminUser) {
          const { sendSubscriptionEmail } = await import("./resend");
          await sendSubscriptionEmail({
            to: adminUser.email,
            nombre: adminUser.nombre,
            plan: (plan as string) ?? "EMPRENDEDOR",
            action: "created",
          }).catch(() => {});
        }
      } catch {}
    } else if (tenantId && inactivo) {
      const cancelado = /cancel|refund/.test(eventType.toLowerCase());
      await prisma.tenant.update({
        where: { id: tenantId },
        data: cancelado
          ? { status: "CANCELADO", recurrenteSubscriptionId: null, plan: "EMPRENDEDOR" }
          : { status: "SUSPENDIDO" },
      });
    }
    return true;
  } catch (error) {
    console.error("Recurrente webhook handler error:", error);
    return false;
  }
}

export function getPlanFromCheckoutMetadata(
  metadata: Record<string, string> | null
): Plan | null {
  if (!metadata?.plan) return null;
  const validPlans: Plan[] = ["EMPRENDEDOR", "NEGOCIO", "CORPORATIVO"];
  return validPlans.includes(metadata.plan as Plan) ? (metadata.plan as Plan) : null;
}

export function createCustomerData(tenantId: string) {
  return {
    reference_id: tenantId,
    metadata: { tenantId },
  };
}

