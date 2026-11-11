export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createCheckoutSession, PLAN_AMOUNTS } from "@/lib/recurrente";
import { buscarCupon } from "@/lib/cupones";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, billingInterval, cupon } = body;

    if (!plan || !billingInterval) {
      return NextResponse.json(
        { success: false, error: "plan y billingInterval son requeridos" },
        { status: 400 }
      );
    }

    const validPlans: Plan[] = ["EMPRENDEDOR", "NEGOCIO", "CORPORATIVO"];
    if (!validPlans.includes(plan as Plan)) {
      return NextResponse.json(
        { success: false, error: "Plan inválido" },
        { status: 400 }
      );
    }

    const validIntervals = ["monthly", "yearly"];
    if (!validIntervals.includes(billingInterval)) {
      return NextResponse.json(
        { success: false, error: "billingInterval debe ser monthly o yearly" },
        { status: 400 }
      );
    }

    const cuponObj = buscarCupon(typeof cupon === "string" ? cupon : undefined);
    if (cupon && !cuponObj) {
      return NextResponse.json(
        { success: false, error: "Cupon invalido o expirado" },
        { status: 400 }
      );
    }

    if (cuponObj?.tipo === "trial") {
      const planTrial = (
        cuponObj.planTrial && validPlans.includes(cuponObj.planTrial as Plan)
          ? cuponObj.planTrial
          : plan
      ) as Plan;
      const dias = cuponObj.dias || 30;
      const trialEndsAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
      await prisma.tenant.update({
        where: { id: session.tenantId },
        data: { status: "TRIAL", plan: planTrial, trialEndsAt },
      });
      return NextResponse.json({
        success: true,
        data: { trial_activado: true, plan: planTrial, dias, trialEndsAt, cupon: cuponObj.codigo },
      });
    }

    const amounts = PLAN_AMOUNTS[plan as Plan];
    const base =
      billingInterval === "monthly" ? amounts.monthly : amounts.yearly;
    const descuento =
      cuponObj?.tipo === "porcentaje"
        ? Math.round(base * (cuponObj.valor / 100))
        : 0;
    const finalAmount = Math.max(0, base - descuento);

    const checkout = await createCheckoutSession({
      tenantId: session.tenantId,
      plan: plan as Plan,
      billingInterval: billingInterval as "monthly" | "yearly",
      customerEmail: session.email,
      tenantName: session.tenantName,
      amountInCents: finalAmount,
      cupon: cuponObj?.codigo || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: checkout.id,
        url: checkout.url,
        descuento,
        monto: finalAmount / 100,
        cupon: cuponObj?.codigo || null,
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al crear sesión de pago",
      },
      { status: 500 }
    );
  }
}
