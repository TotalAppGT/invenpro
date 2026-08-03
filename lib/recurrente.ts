import { prisma } from "./prisma";
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

const PLAN_AMOUNTS: Record<Plan, { monthly: number; yearly: number }> = {
  EMPRENDEDOR: { monthly: 14900, yearly: 143000 },
  NEGOCIO: { monthly: 44900, yearly: 431000 },
  CORPORATIVO: { monthly: 99900, yearly: 959000 },
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
}

export async function createCheckoutSession({
  tenantId,
  plan,
  billingInterval,
  customerEmail,
  tenantName,
}: CreateCheckoutSessionParams): Promise<{ id: string; url: string }> {
  const amounts = PLAN_AMOUNTS[plan];
  if (!amounts) {
    throw new Error(`No amount configured for plan ${plan}`);
  }

  const amountInCents = billingInterval === "monthly" ? amounts.monthly : amounts.yearly;
  const planLabel = PLAN_LABELS[plan];
  const intervalLabel = billingInterval === "monthly" ? "Mensual" : "Anual";

  const body = {
    items: [
      {
        name: `${planLabel} - ${intervalLabel}`,
        amount: amountInCents,
        quantity: 1,
      },
    ],
    metadata: {
      tenantId,
      plan,
      billingInterval,
      tenantName,
    },
    customer_email: customerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion?checkout=canceled`,
  };

  const response = await recurrenteFetch(recurrente, "/api/checkouts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return { id: data.id, url: data.url };
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
      `/api/subscriptions/${subscriptionId}`
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
    `/api/subscriptions/${subscriptionId}/cancel`,
    { method: "POST" }
  );
}

export async function handleWebhookEvent(
  payload: string,
  signature: string
): Promise<boolean> {
  const webhookSecret = process.env.RECURRENTE_WEBHOOK_SECRET!;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexToUint8Array(signature),
    encoder.encode(payload)
  );

  if (!isValid) {
    console.error("Recurrente webhook signature verification failed");
    return false;
  }

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    console.error("Failed to parse webhook payload");
    return false;
  }

  try {
    switch (event.type) {
      case "checkout.completed": {
        const tenantId = event.data?.metadata?.tenantId;
        const plan = event.data?.metadata?.plan;
        if (!tenantId) break;

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            status: "ACTIVO",
            recurrenteSubscriptionId: event.data?.subscription_id ?? undefined,
            trialEndsAt: null,
            plan: plan ?? undefined,
          },
        });

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
        break;
      }

      case "subscription.updated": {
        const tenantId = event.data?.metadata?.tenantId;
        if (!tenantId) break;

        const statusMap: Record<string, string> = {
          active: "ACTIVO",
          past_due: "SUSPENDIDO",
          unpaid: "SUSPENDIDO",
          canceled: "CANCELADO",
          incomplete: "TRIAL",
          incomplete_expired: "CANCELADO",
          trialing: "TRIAL",
        };

        const newStatus = statusMap[event.data?.status] ?? "ACTIVO";
        const plan = event.data?.metadata?.plan;

        const updateData: Record<string, unknown> = {
          recurrenteSubscriptionId: event.data?.id,
          status: newStatus,
        };
        if (plan) updateData.plan = plan;

        if (!event.data?.cancel_at_period_end && event.data?.status === "active") {
          updateData.trialEndsAt = null;
        }

        await prisma.tenant.update({
          where: { id: tenantId },
          data: updateData,
        });
        break;
      }

      case "subscription.cancelled": {
        const tenantId = event.data?.metadata?.tenantId;
        if (!tenantId) break;

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            status: "CANCELADO",
            recurrenteSubscriptionId: null,
            plan: "EMPRENDEDOR",
          },
        });

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
            plan: "EMPRENDEDOR",
            action: "canceled",
          }).catch(() => {});
        }
        break;
      }

      case "payment.failed": {
        const subscriptionId = event.data?.subscription_id;
        if (subscriptionId) {
          try {
            const subscription = await getSubscriptionStatus(subscriptionId);
            const tenantId = event.data?.metadata?.tenantId;

            if (tenantId) {
              await prisma.tenant.update({
                where: { id: tenantId },
                data: { status: "SUSPENDIDO" },
              });

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
                  plan: (event.data?.metadata?.plan as string) ?? "EMPRENDEDOR",
                  action: "updated",
                  details: "El pago ha fallado. Por favor actualiza tu método de pago en Recurrente.",
                }).catch(() => {});
              }
            }
          } catch (innerErr) {
            console.error("Failed to handle payment.failed:", innerErr);
          }
        }
        break;
      }

      default:
        break;
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

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
