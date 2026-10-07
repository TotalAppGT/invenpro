export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redondear } from "@/lib/ventas";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const cxp = await prisma.cuentaPorPagar.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!cxp) return NextResponse.json({ success: false, error: "Cuenta no encontrada" }, { status: 404 });

    const body = await request.json();
    const monto = Number(body.monto);
    if (!monto || monto <= 0) return NextResponse.json({ success: false, error: "El monto debe ser mayor a 0" }, { status: 400 });

    const saldoActual = Number(cxp.saldo);
    if (saldoActual <= 0) return NextResponse.json({ success: false, error: "La cuenta ya está pagada" }, { status: 400 });

    const aplicar = Math.min(monto, saldoActual);
    const nuevoSaldo = redondear(saldoActual - aplicar);

    await prisma.cuentaPorPagar.update({
      where: { id: cxp.id },
      data: { saldo: nuevoSaldo, estado: nuevoSaldo <= 0 ? "PAGADA" : "PARCIAL" },
    });

    return NextResponse.json({ success: true, message: `Pago de Q${aplicar.toFixed(2)} registrado`, data: { saldo: nuevoSaldo } });
  } catch (error) {
    console.error("CxP PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
