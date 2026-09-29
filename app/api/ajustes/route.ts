export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { ajusteSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (estado) where.estado = estado;

    const [total, ajustes] = await Promise.all([
      prisma.ajusteInventario.count({ where }),
      prisma.ajusteInventario.findMany({
        where,
        include: {
          bodega: { select: { id: true, nombre: true } },
          solicitante: { select: { id: true, nombre: true } },
          aprobador: { select: { id: true, nombre: true } },
          items: { include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: ajustes,
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
    console.error("Ajustes GET error:", error);
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
    const validation = ajusteSchema.safeParse(body);
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

    const count = await prisma.ajusteInventario.count({ where: { tenantId: session.tenantId } });
    const numero = `AJU-${String(count + 1).padStart(6, "0")}`;

    const ajuste = await prisma.ajusteInventario.create({
      data: {
        numero,
        estado: "PENDIENTE",
        motivo: data.motivo,
        observacion: data.observacion ?? null,
        bodegaId: data.bodegaId,
        solicitanteId: session.uid,
        tenantId: session.tenantId,
        items: {
          create: data.items.map((item) => ({
            productoId: item.productoId,
            cantidadSistema: item.cantidadSistema,
            cantidadFisica: item.cantidadFisica,
            diferencia: item.cantidadFisica - item.cantidadSistema,
            costoUnit: item.costoUnit ?? 0,
            lote: item.lote ?? null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: ajuste, message: "Ajuste solicitado (pendiente de aprobación)" }, { status: 201 });
  } catch (error) {
    console.error("Ajustes POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
