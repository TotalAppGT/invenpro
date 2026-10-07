export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { ventaSchema } from "@/lib/validations";
import { aplicarSalida, calcularTotales, generarNumero, redondear } from "@/lib/ventas";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") ?? "";
    const clienteId = searchParams.get("clienteId") ?? "";
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;
    if (desde || hasta) {
      const f: Record<string, Date> = {};
      if (desde) f.gte = new Date(desde);
      if (hasta) { const h = new Date(hasta); h.setHours(23, 59, 59, 999); f.lte = h; }
      where.fecha = f;
    }

    const [total, ventas] = await Promise.all([
      prisma.venta.count({ where }),
      prisma.venta.findMany({
        where,
        include: {
          cliente: { select: { id: true, nombre: true, nit: true } },
          usuario: { select: { id: true, nombre: true } },
          _count: { select: { items: true } },
        },
        orderBy: { fecha: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: ventas.map((v: any) => ({
        id: v.id, numero: v.numero, tipo: v.tipo, estado: v.estado,
        cliente: v.cliente, usuario: v.usuario, fecha: v.fecha,
        subtotal: Number(v.subtotal), descuento: Number(v.descuento), impuesto: Number(v.impuesto),
        total: Number(v.total), pagado: Number(v.pagado), saldo: Number(v.saldo),
        itemsCount: v._count.items, notas: v.notas,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error("Ventas GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = ventaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const esCredito = data.tipo === "CREDITO" || data.pagoInmediato === false;
    if (esCredito && !data.clienteId) {
      return NextResponse.json({ success: false, error: "Una venta a crédito requiere un cliente" }, { status: 400 });
    }

    const bodega = await prisma.bodega.findFirst({ where: { id: data.bodegaId, tenantId: session.tenantId } });
    if (!bodega) return NextResponse.json({ success: false, error: "Bodega no encontrada" }, { status: 404 });

    if (data.clienteId) {
      const cliente = await prisma.cliente.findFirst({ where: { id: data.clienteId, tenantId: session.tenantId } });
      if (!cliente) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });
    }

    const productoIds = data.items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, tenantId: session.tenantId } });
    if (productos.length !== new Set(productoIds).size) {
      return NextResponse.json({ success: false, error: "Uno o más productos no existen" }, { status: 404 });
    }

    const totales = calcularTotales(data.items, data.descuentoGlobal ?? 0, data.impuestoPct ?? 12);
    let pagado = esCredito ? 0 : (data.montoPagado ?? totales.total);
    pagado = Math.max(0, Math.min(pagado, totales.total));
    const saldo = redondear(totales.total - pagado);

    const result = await prisma.$transaction(async (tx) => {
      const numero = await generarNumero(tx, "venta", session.tenantId, "VEN");

      const venta = await tx.venta.create({
        data: {
          numero,
          tipo: data.tipo,
          estado: "CONFIRMADA",
          clienteId: data.clienteId ?? null,
          usuarioId: session.uid,
          cajaId: data.cajaId ?? null,
          subtotal: totales.subtotal,
          descuento: totales.descuento,
          impuesto: totales.impuesto,
          total: totales.total,
          pagado,
          saldo,
          notas: data.notas ?? null,
          tenantId: session.tenantId,
        },
      });

      for (const item of data.items) {
        const costo = await aplicarSalida(tx, {
          bodegaId: data.bodegaId,
          productoId: item.productoId,
          cantidad: item.cantidad,
          usuarioId: session.uid,
          tenantId: session.tenantId,
          documento: numero,
          notas: `Venta ${numero}`,
        });
        const subtotalLinea = redondear(item.cantidad * item.precioUnit * (1 - (item.descuento ?? 0) / 100));
        await tx.ventaItem.create({
          data: {
            ventaId: venta.id,
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnit: item.precioUnit,
            costoUnit: costo,
            descuento: item.descuento ?? 0,
            subtotal: subtotalLinea,
          },
        });
      }

      if (pagado > 0) {
        await tx.pago.create({
          data: {
            monto: pagado, metodo: data.metodoPago ?? "EFECTIVO", ventaId: venta.id,
            clienteId: data.clienteId ?? null, cajaId: data.cajaId ?? null, tenantId: session.tenantId,
          },
        });
        if (data.cajaId) {
          await tx.movimientoCaja.create({
            data: { cajaId: data.cajaId, tipo: "VENTA", monto: pagado, concepto: `Venta ${numero}`, referencia: numero },
          });
        }
      }

      if (saldo > 0 && data.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } });
        const dias = cliente?.diasCredito ?? 0;
        const vencimiento = new Date();
        vencimiento.setDate(vencimiento.getDate() + dias);
        await tx.cuentaPorCobrar.create({
          data: { clienteId: data.clienteId, ventaId: venta.id, monto: saldo, saldo, vencimiento, estado: "PENDIENTE", tenantId: session.tenantId },
        });
        await tx.cliente.update({ where: { id: data.clienteId }, data: { saldo: { increment: saldo } } });
      }

      return venta;
    });

    return NextResponse.json({ success: true, data: { id: result.id, numero: result.numero }, message: `Venta ${result.numero} registrada` }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stock insuficiente")) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Ventas POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
