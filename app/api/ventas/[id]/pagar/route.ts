export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { pagoSchema } from "@/lib/validations";
import { redondear } from "@/lib/ventas";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const venta = await prisma.venta.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!venta) return NextResponse.json({ success: false, error: "Venta no encontrada" }, { status: 404 });
    if (venta.estado === "ANULADA") return NextResponse.json({ success: false, error: "La venta está anulada" }, { status: 400 });

    const body = await request.json();
    const validation = pagoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const saldoActual = Number(venta.saldo);
    if (saldoActual <= 0) return NextResponse.json({ success: false, error: "La venta no tiene saldo pendiente" }, { status: 400 });

    const monto = Math.min(data.monto, saldoActual);
    const nuevoSaldo = redondear(saldoActual - monto);
    const nuevoPagado = redondear(Number(venta.pagado) + monto);

    await prisma.$transaction(async (tx) => {
      await tx.pago.create({
        data: {
          monto, metodo: data.metodo, referencia: data.referencia ?? null,
          ventaId: venta.id, clienteId: venta.clienteId ?? null, cajaId: data.cajaId ?? null, tenantId: session.tenantId,
        },
      });
      if (data.cajaId) {
        await tx.movimientoCaja.create({
          data: { cajaId: data.cajaId, tipo: "VENTA", monto, concepto: `Abono venta ${venta.numero}`, referencia: venta.numero },
        });
      }
      await tx.venta.update({ where: { id: venta.id }, data: { pagado: nuevoPagado, saldo: nuevoSaldo } });

      const cxcs = await tx.cuentaPorCobrar.findMany({ where: { ventaId: venta.id, estado: { not: "ANULADA" } }, orderBy: { createdAt: "asc" } });
      let restante = monto;
      for (const cxc of cxcs) {
        if (restante <= 0) break;
        const cxcSaldo = Number(cxc.saldo);
        const aplicar = Math.min(restante, cxcSaldo);
        const nuevo = redondear(cxcSaldo - aplicar);
        await tx.cuentaPorCobrar.update({
          where: { id: cxc.id },
          data: { saldo: nuevo, estado: nuevo <= 0 ? "PAGADA" : "PARCIAL" },
        });
        restante = redondear(restante - aplicar);
      }
      if (venta.clienteId) {
        await tx.cliente.update({ where: { id: venta.clienteId }, data: { saldo: { decrement: monto } } });
      }
    });

    return NextResponse.json({ success: true, message: `Pago de Q${monto.toFixed(2)} registrado`, data: { saldo: nuevoSaldo } });
  } catch (error) {
    console.error("Venta pago error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
