export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { cajaCerrarSchema } from "@/lib/validations";
import { redondear } from "@/lib/ventas";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const caja = await prisma.caja.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { movimientos: { orderBy: { fecha: "desc" } }, usuario: { select: { id: true, nombre: true } } },
    });
    if (!caja) return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });

    const ingresos = caja.movimientos.filter((m) => ["INGRESO", "VENTA", "APERTURA"].includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0);
    const egresos = caja.movimientos.filter((m) => ["EGRESO", "RETIRO", "DEVOLUCION"].includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0);
    const esperado = redondear(Number(caja.montoInicial) + ingresos - egresos);

    return NextResponse.json({
      success: true,
      data: {
        ...caja,
        montoInicial: Number(caja.montoInicial),
        montoFinal: caja.montoFinal !== null ? Number(caja.montoFinal) : null,
        diferencia: caja.diferencia !== null ? Number(caja.diferencia) : null,
        esperado, ingresos: redondear(ingresos), egresos: redondear(egresos),
        movimientos: caja.movimientos.map((m: any) => ({ ...m, monto: Number(m.monto) })),
      },
    });
  } catch (error) {
    console.error("Caja GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const caja = await prisma.caja.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { movimientos: true },
    });
    if (!caja) return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });
    if (caja.estado === "CERRADA") return NextResponse.json({ success: false, error: "La caja ya está cerrada" }, { status: 400 });

    const body = await request.json();
    const validation = cajaCerrarSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const ingresos = caja.movimientos.filter((m) => ["INGRESO", "VENTA", "APERTURA"].includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0);
    const egresos = caja.movimientos.filter((m) => ["EGRESO", "RETIRO", "DEVOLUCION"].includes(m.tipo)).reduce((s, m) => s + Number(m.monto), 0);
    const esperado = redondear(Number(caja.montoInicial) + ingresos - egresos);
    const diferencia = redondear(validation.data.montoFinal - esperado);

    const updated = await prisma.$transaction(async (tx) => {
      const c = await tx.caja.update({
        where: { id: caja.id },
        data: { estado: "CERRADA", montoFinal: validation.data.montoFinal, diferencia, cierre: new Date(), notas: validation.data.notas ?? null },
      });
      await tx.movimientoCaja.create({
        data: { cajaId: caja.id, tipo: "CIERRE", monto: validation.data.montoFinal, concepto: `Cierre de caja (esperado Q${esperado.toFixed(2)})` },
      });
      return c;
    });

    return NextResponse.json({ success: true, data: { id: updated.id, diferencia, esperado }, message: `Caja cerrada. Diferencia: Q${diferencia.toFixed(2)}` });
  } catch (error) {
    console.error("Caja PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
