export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { numeroSerieSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get("productoId") ?? "";
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const estado = searchParams.get("estado") ?? "";
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (productoId) where.productoId = productoId;
    if (bodegaId) where.bodegaId = bodegaId;
    if (estado) where.estado = estado;
    if (search.trim()) where.serie = { contains: search.trim(), mode: "insensitive" };

    const [total, series] = await Promise.all([
      prisma.numeroSerie.count({ where }),
      prisma.numeroSerie.findMany({
        where,
        include: {
          producto: { select: { id: true, codigo: true, nombre: true } },
          bodega: { select: { id: true, nombre: true } },
          ubicacion: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: series.map((s: any) => ({ ...s, costoUnit: s.costoUnit !== null ? Number(s.costoUnit) : null })),
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
    console.error("Numeros serie GET error:", error);
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
    const validation = numeroSerieSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const [producto, bodega] = await Promise.all([
      prisma.producto.findFirst({ where: { id: data.productoId, tenantId: session.tenantId } }),
      prisma.bodega.findFirst({ where: { id: data.bodegaId, tenantId: session.tenantId } }),
    ]);
    if (!producto) return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    if (!bodega) return NextResponse.json({ success: false, error: "Bodega no encontrada" }, { status: 404 });

    if (data.ubicacionId) {
      const ubic = await prisma.ubicacion.findFirst({ where: { id: data.ubicacionId, tenantId: session.tenantId } });
      if (!ubic) return NextResponse.json({ success: false, error: "Ubicación no encontrada" }, { status: 404 });
    }

    const existe = await prisma.numeroSerie.findFirst({
      where: { tenantId: session.tenantId, serie: data.serie },
    });
    if (existe) {
      return NextResponse.json({ success: false, error: "El número de serie ya está registrado" }, { status: 400 });
    }

    const serie = await prisma.numeroSerie.create({
      data: {
        serie: data.serie,
        productoId: data.productoId,
        bodegaId: data.bodegaId,
        ubicacionId: data.ubicacionId ?? null,
        lote: data.lote ?? null,
        estado: data.estado ?? "DISPONIBLE",
        costoUnit: data.costoUnit ?? null,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        notas: data.notas ?? null,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json({ success: true, data: serie, message: "Número de serie registrado" }, { status: 201 });
  } catch (error) {
    console.error("Numeros serie POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
