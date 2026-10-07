export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { cotizacionSchema } from "@/lib/validations";
import { calcularTotales, generarNumero, redondear } from "@/lib/ventas";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") ?? "";
    const clienteId = searchParams.get("clienteId") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;

    const [total, cotizaciones] = await Promise.all([
      prisma.cotizacion.count({ where }),
      prisma.cotizacion.findMany({
        where,
        include: {
          cliente: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: cotizaciones.map((c: any) => ({
        id: c.id, numero: c.numero, estado: c.estado, cliente: c.cliente, usuario: c.usuario,
        fecha: c.createdAt, validaHasta: c.validaHasta,
        subtotal: Number(c.subtotal), descuento: Number(c.descuento), impuesto: Number(c.impuesto), total: Number(c.total),
        itemsCount: c._count.items, notas: c.notas,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error("Cotizaciones GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = cotizacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const cliente = await prisma.cliente.findFirst({ where: { id: data.clienteId, tenantId: session.tenantId } });
    if (!cliente) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

    const productoIds = data.items.map((i) => i.productoId);
    const productos = await prisma.producto.findMany({ where: { id: { in: productoIds }, tenantId: session.tenantId } });
    if (productos.length !== new Set(productoIds).size) {
      return NextResponse.json({ success: false, error: "Uno o más productos no existen" }, { status: 404 });
    }

    const totales = calcularTotales(data.items, data.descuentoGlobal ?? 0, data.impuestoPct ?? 12);

    const cotizacion = await prisma.$transaction(async (tx) => {
      const numero = await generarNumero(tx, "cotizacion", session.tenantId, "COT");
      const cot = await tx.cotizacion.create({
        data: {
          numero, estado: "BORRADOR", clienteId: data.clienteId, usuarioId: session.uid,
          subtotal: totales.subtotal, descuento: totales.descuento, impuesto: totales.impuesto, total: totales.total,
          validaHasta: data.validaHasta ? new Date(data.validaHasta) : null, notas: data.notas ?? null, tenantId: session.tenantId,
        },
      });
      await tx.cotizacionItem.createMany({
        data: data.items.map((i) => ({
          cotizacionId: cot.id, productoId: i.productoId, descripcion: i.descripcion ?? null,
          cantidad: i.cantidad, precioUnit: i.precioUnit, descuento: i.descuento ?? 0,
          subtotal: redondear(i.cantidad * i.precioUnit * (1 - (i.descuento ?? 0) / 100)),
        })),
      });
      return cot;
    });

    return NextResponse.json(
      { success: true, data: { id: cotizacion.id, numero: cotizacion.numero }, message: `Cotización ${cotizacion.numero} creada` },
      { status: 201 }
    );
  } catch (error) {
    console.error("Cotizaciones POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
