export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { pagoSchema } from "@/lib/validations";
import { redondear } from "@/lib/ventas";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const cxc = await prisma.cuentaPorCobrar.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!cxc) return NextResponse.json({ success: false, error: "Cuenta no encontrada" }, { status: 404 });

    const body = await request.json();
    const validation = pagoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const saldoActual = Number(cxc.saldo);
    if (saldoActual <= 0) return NextResponse.json({ success: false, error: "La cuenta ya está pagada" }, { status: 400 });

    const monto = Math.min(data.monto, saldoActual);
    const nuevoSaldo = redondear(saldoActual - monto);

    await prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: {
          monto, metodo: data.metodo, referencia: data.referencia ?? null,
          clienteId: cxc.clienteId, ventaId: cxc.ventaId ?? null, cajaId: data.cajaId ?? null, tenantId: session.tenantId,
        },
      });
      if (data.cajaId) {
        await tx.movimientoCaja.create({
          data: { cajaId: data.cajaId, tipo: "INGRESO", monto, concepto: "Abono cuenta por cobrar", referencia: cxc.id },
        });
      }
      await tx.cuentaPorCobrar.update({
        where: { id: cxc.id },
        data: { saldo: nuevoSaldo, estado: nuevoSaldo <= 0 ? "PAGADA" : "PARCIAL" },
      });
      await tx.cliente.update({ where: { id: cxc.clienteId }, data: { saldo: { decrement: monto } } });
      if (cxc.ventaId) {
        const venta = await tx.venta.findUnique({ where: { id: cxc.ventaId } });
        if (venta) {
          const nuevoPagado = redondear(Number(venta.pagado) + monto);
          await tx.venta.update({ where: { id: venta.id }, data: { pagado: nuevoPagado, saldo: redondear(Number(venta.total) - nuevoPagado) } });
        }
      }
    });

    return NextResponse.json({ success: true, message: `Abono de Q${monto.toFixed(2)} registrado`, data: { saldo: nuevoSaldo } });
  } catch (error) {
    console.error("CxC PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
