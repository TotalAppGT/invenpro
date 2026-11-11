import { prisma } from "./prisma";
import { sendSubscriptionEmail } from "./resend";

const DIAS_GRACIA = 3;
const MS_DIA = 86_400_000;

function cfgDe(config: unknown): Record<string, any> {
  return config && typeof config === "object" ? (config as Record<string, any>) : {};
}

export async function extenderVigencia(
  tenantId: string,
  ciclo: string,
  plan?: string
): Promise<Date> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { config: true } });
  const cfg = cfgDe(t?.config);
  const ahora = new Date();
  const actual = cfg.planVenceAt ? new Date(cfg.planVenceAt) : null;
  const base = actual && actual > ahora ? actual : ahora;
  const dias = ciclo === "anual" ? 365 : 30;
  const vence = new Date(base.getTime() + dias * MS_DIA);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: "ACTIVO",
      trialEndsAt: null,
      ...(plan ? { plan: plan as any } : {}),
      config: {
        ...cfg,
        planVenceAt: vence.toISOString(),
        ciclo,
        avisoVence: null,
        avisoVencido: null,
      } as any,
    },
  });
  return vence;
}

export async function procesarVencimientos(): Promise<{ avisos: number; suspendidos: number }> {
  const ahora = new Date();
  const tenants = await prisma.tenant.findMany({
    where: { status: { in: ["ACTIVO", "TRIAL"] } },
    include: {
      users: { where: { rol: "ADMIN" }, take: 1, select: { email: true, nombre: true } },
    },
  });

  let avisos = 0;
  let suspendidos = 0;

  for (const t of tenants) {
    const cfg = cfgDe(t.config);
    const venceStr =
      t.status === "TRIAL" ? t.trialEndsAt?.toISOString() : (cfg.planVenceAt as string | undefined);
    if (!venceStr) continue;

    const vence = new Date(venceStr);
    if (Number.isNaN(vence.getTime())) continue;
    const dias = (vence.getTime() - ahora.getTime()) / MS_DIA;
    if (dias > DIAS_GRACIA) continue;

    const admin = t.users[0];

    if (dias <= 0) {
      if (!cfg.avisoVencido) {
        await prisma.tenant.update({
          where: { id: t.id },
          data: { status: "SUSPENDIDO", config: { ...cfg, avisoVencido: ahora.toISOString() } as any },
        });
        if (admin?.email) {
          await sendSubscriptionEmail({
            to: admin.email,
            nombre: admin.nombre || t.name,
            plan: t.plan,
            action: "expired",
            details: "Tu suscripcion vencio. Renueva tu plan para recuperar el acceso.",
          }).catch(() => {});
        }
        suspendidos++;
      }
    } else if (!cfg.avisoVence) {
      await prisma.tenant.update({
        where: { id: t.id },
        data: { config: { ...cfg, avisoVence: ahora.toISOString() } as any },
      });
      if (admin?.email) {
        await sendSubscriptionEmail({
          to: admin.email,
          nombre: admin.nombre || t.name,
          plan: t.plan,
          action: "trial_ending",
          details: `Tu plan vence el ${vence.toLocaleDateString("es-GT")}.`,
        }).catch(() => {});
      }
      avisos++;
    }
  }

  return { avisos, suspendidos };
}
