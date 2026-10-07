export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { aplicarSalida, generarNumero } from "@/lib/ventas";

const ESTADOS: Record<string, string> = {
  ENVIAR: "ENVIADA", ACEPTAR: "ACEPTADA", RECHAZAR: "RECHAZADA", ANULAR: "ANULADA",
};

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const cot = await prisma.cotizacion.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: {
        cliente: true,
        usuario: { select: { id: true, nombre: true } },
        items: { include: { producto: { select: { id: true, codigo: true, nombre: true, unidadMedida: true } } } },
      },
    });
    if (!cot) return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        ...cot,
        subtotal: Number(cot.subtotal), descuento: Number(cot.descuento), impuesto: Number(cot.impuesto), total: Number(cot.total),
        items: cot.items.map((i: any) => ({ ...i, precioUnit: Number(i.precioUnit), descuento: Number(i.descuento), subtotal: Number(i.subtotal) })),
      },
    });
  } catch (error) {
    console.error("Cotizacion GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const cot = await prisma.cotizacion.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true },
    });
    if (!cot) return NextResponse.json({ success: false, error: "Cotización no encontrada" }, { status: 404 });

    const body = await request.json();
    const accion = body.accion as string;

    if (accion === "CONVERTIR") {
      if (cot.estado === "CONVERTIDA") {
        return NextResponse.json({ success: false, error: "La cotización ya fue convertida" }, { status: 400 });
      }
      const bodegaId = body.bodegaId as string;
      if (!bodegaId) return NextResponse.json({ success: false, error: "Selecciona una bodega para la venta" }, { status: 400 });
      const bodega = await prisma.bodega.findFirst({ where: { id: bodegaId, tenantId: session.tenantId } });
      if (!bodega) return NextResponse.json({ success: false, error: "Bodega no encontrada" }, { status: 404 });

      const venta = await prisma.$transaction(async (tx) => {
        const numero = await generarNumero(tx, "venta", session.tenantId, "VEN");
        const total = Number(cot.total);
        const v = await tx.venta.create({
          data: {
            numero, tipo: "FACTURA", estado: "CONFIRMADA", clienteId: cot.clienteId, usuarioId: session.uid,
            cotizacionId: cot.id, subtotal: cot.subtotal, descuento: cot.descuento, impuesto: cot.impuesto,
            total, pagado: 0, saldo: total, notas: `Convertida de ${cot.numero}`, tenantId: session.tenantId,
          },
        });
        for (const item of cot.items) {
          const costo = await aplicarSalida(tx, {
            bodegaId, productoId: item.productoId, cantidad: item.cantidad, usuarioId: session.uid,
            tenantId: session.tenantId, documento: numero, notas: `Venta ${numero} (desde ${cot.numero})`,
          });
          await tx.ventaItem.create({
            data: { ventaId: v.id, productoId: item.productoId, cantidad: item.cantidad, precioUnit: item.precioUnit, costoUnit: costo, descuento: item.descuento, subtotal: item.subtotal },
          });
        }
        const cliente = await tx.cliente.findUnique({ where: { id: cot.clienteId } });
        const dias = cliente?.diasCredito ?? 0;
        const venc = new Date();
        venc.setDate(venc.getDate() + dias);
        await tx.cuentaPorCobrar.create({
          data: { clienteId: cot.clienteId, ventaId: v.id, monto: total, saldo: total, vencimiento: venc, estado: "PENDIENTE", tenantId: session.tenantId },
        });
        await tx.cliente.update({ where: { id: cot.clienteId }, data: { saldo: { increment: total } } });
        await tx.cotizacion.update({ where: { id: cot.id }, data: { estado: "CONVERTIDA" } });
        return v;
      });

      return NextResponse.json({ success: true, message: `Cotización convertida en venta ${venta.numero}`, data: { ventaId: venta.id, numero: venta.numero } });
    }

    const nuevoEstado = ESTADOS[accion];
    if (!nuevoEstado) return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });

    await prisma.cotizacion.update({ where: { id: cot.id }, data: { estado: nuevoEstado as never } });
    return NextResponse.json({ success: true, message: `Cotización marcada como ${nuevoEstado}` });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stock insuficiente")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Cotizacion PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
