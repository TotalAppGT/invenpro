export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const venta = await prisma.venta.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true } },
        items: { include: { producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: true } } } },
        pagos: { orderBy: { fecha: "desc" } },
      },
    });
    if (!venta) return NextResponse.json({ success: false, error: "Venta no encontrada" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        ...venta,
        subtotal: Number(venta.subtotal), descuento: Number(venta.descuento), impuesto: Number(venta.impuesto),
        total: Number(venta.total), pagado: Number(venta.pagado), saldo: Number(venta.saldo),
        items: venta.items.map((i: any) => ({ ...i, precioUnit: Number(i.precioUnit), costoUnit: Number(i.costoUnit), descuento: Number(i.descuento), subtotal: Number(i.subtotal) })),
        pagos: venta.pagos.map((p: any) => ({ ...p, monto: Number(p.monto) })),
      },
    });
  } catch (error) {
    console.error("Venta GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const venta = await prisma.venta.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true },
    });
    if (!venta) return NextResponse.json({ success: false, error: "Venta no encontrada" }, { status: 404 });

    const body = await request.json();
    if (body.accion !== "ANULAR") {
      return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
    }
    if (venta.estado === "ANULADA") {
      return NextResponse.json({ success: false, error: "La venta ya está anulada" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Devolver stock usando los movimientos generados por esta venta
      const movs = await tx.movimiento.findMany({ where: { tenantId: session.tenantId, documento: venta.numero, tipo: "SALIDA" } });
      for (const mov of movs) {
        const inv = await tx.inventario.findUnique({
          where: { bodegaId_productoId_lote: { bodegaId: mov.bodegaId, productoId: mov.productoId, lote: "" } },
        });
        const cantAnterior = inv?.cantidad ?? 0;
        const cantNueva = cantAnterior + mov.cantidad;
        if (inv) {
          await tx.inventario.update({ where: { id: inv.id }, data: { cantidad: cantNueva } });
        } else {
          await tx.inventario.create({ data: { bodegaId: mov.bodegaId, productoId: mov.productoId, lote: "", cantidad: mov.cantidad } });
        }
        await tx.movimiento.create({
          data: {
            tipo: "ENTRADA", cantidad: mov.cantidad, cantAnterior, cantNueva,
            costoUnit: mov.costoUnit, total: Number(mov.costoUnit ?? 0) * mov.cantidad,
            bodegaId: mov.bodegaId, productoId: mov.productoId, usuarioId: session.uid,
            notas: `Anulación de venta ${venta.numero}`, documento: venta.numero, tenantId: session.tenantId,
          },
        });
      }

      // Anular cuentas por cobrar y descontar saldo del cliente
      const cxcs = await tx.cuentaPorCobrar.findMany({ where: { ventaId: venta.id, estado: { not: "ANULADA" } } });
      for (const cxc of cxcs) {
        await tx.cuentaPorCobrar.update({ where: { id: cxc.id }, data: { estado: "ANULADA", saldo: 0 } });
        await tx.cliente.update({ where: { id: cxc.clienteId }, data: { saldo: { decrement: Number(cxc.saldo) } } });
      }

      await tx.venta.update({ where: { id: venta.id }, data: { estado: "ANULADA", saldo: 0 } });
    });

    return NextResponse.json({ success: true, message: "Venta anulada y stock restaurado" });
  } catch (error) {
    console.error("Venta PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
