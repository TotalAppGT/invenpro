export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/recurrente";
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
    const { plan, billingInterval } = body;

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

    const checkout = await createCheckoutSession({
      tenantId: session.tenantId,
      plan: plan as Plan,
      billingInterval: billingInterval as "monthly" | "yearly",
      customerEmail: session.email,
      tenantName: session.tenantName,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: checkout.id,
        url: checkout.url,
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
