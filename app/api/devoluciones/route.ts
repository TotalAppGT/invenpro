export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { devolucionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") ?? "";
    const estado = searchParams.get("estado") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    const [total, devoluciones] = await Promise.all([
      prisma.devolucion.count({ where }),
      prisma.devolucion.findMany({
        where,
        include: {
          bodega: { select: { id: true, nombre: true } },
          cliente: { select: { id: true, nombre: true } },
          proveedor: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          items: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: devoluciones.map((d: any) => ({ ...d, total: Number(d.total) })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Devoluciones GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = devolucionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const bodega = await prisma.bodega.findFirst({ where: { id: data.bodegaId, tenantId: session.tenantId } });
    if (!bodega) return NextResponse.json({ success: false, error: "Bodega no encontrada" }, { status: 404 });

    for (const item of data.items) {
      const producto = await prisma.producto.findFirst({ where: { id: item.productoId, tenantId: session.tenantId } });
      if (!producto) return NextResponse.json({ success: false, error: `Producto ${item.productoId} no encontrado` }, { status: 404 });
    }

    const total = data.items.reduce((sum, item) => {
      const unit = data.tipo === "CLIENTE" ? item.precioUnit ?? 0 : item.costoUnit ?? 0;
      return sum + unit * item.cantidad;
    }, 0);

    const count = await prisma.devolucion.count({ where: { tenantId: session.tenantId } });
    const numero = `DEV-${String(count + 1).padStart(6, "0")}`;

    const devolucion = await prisma.devolucion.create({
      data: {
        numero,
        tipo: data.tipo,
        estado: "PENDIENTE",
        motivo: data.motivo,
        observacion: data.observacion ?? null,
        total,
        bodegaId: data.bodegaId,
        clienteId: data.clienteId ?? null,
        proveedorId: data.proveedorId ?? null,
        usuarioId: session.uid,
        tenantId: session.tenantId,
        items: {
          create: data.items.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            costoUnit: item.costoUnit ?? 0,
            precioUnit: item.precioUnit ?? 0,
            lote: item.lote ?? null,
            reingresa: item.reingresa ?? true,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: devolucion, message: "Devolución registrada" }, { status: 201 });
  } catch (error) {
    console.error("Devoluciones POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
