export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { ubicacionSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (bodegaId) where.bodegaId = bodegaId;
    if (search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: "insensitive" } },
        { codigo: { contains: search.trim(), mode: "insensitive" } },
        { pasillo: { contains: search.trim(), mode: "insensitive" } },
        { rack: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const ubicaciones = await prisma.ubicacion.findMany({
      where,
      include: {
        bodega: { select: { id: true, nombre: true } },
        _count: { select: { inventarios: true, series: true } },
      },
      orderBy: [{ bodega: { nombre: "asc" } }, { codigo: "asc" }],
    });

    const data = ubicaciones.map((u: any) => ({
      id: u.id,
      codigo: u.codigo,
      nombre: u.nombre,
      tipo: u.tipo,
      pasillo: u.pasillo,
      rack: u.rack,
      nivel: u.nivel,
      posicion: u.posicion,
      capacidad: u.capacidad,
      activa: u.activa,
      bodega: u.bodega,
      bodegaId: u.bodegaId,
      productosCount: u._count.inventarios,
      seriesCount: u._count.series,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Ubicaciones GET error:", error);
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
    const validation = ubicacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const bodega = await prisma.bodega.findFirst({
      where: { id: validation.data.bodegaId, tenantId: session.tenantId },
    });
    if (!bodega) {
      return NextResponse.json({ success: false, error: "Bodega no encontrada" }, { status: 404 });
    }

    const existe = await prisma.ubicacion.findFirst({
      where: { bodegaId: validation.data.bodegaId, codigo: validation.data.codigo, tenantId: session.tenantId },
    });
    if (existe) {
      return NextResponse.json({ success: false, error: "Ya existe una ubicación con ese código en la bodega" }, { status: 400 });
    }

    const ubicacion = await prisma.ubicacion.create({
      data: {
        codigo: validation.data.codigo,
        nombre: validation.data.nombre,
        tipo: validation.data.tipo,
        pasillo: validation.data.pasillo ?? null,
        rack: validation.data.rack ?? null,
        nivel: validation.data.nivel ?? null,
        posicion: validation.data.posicion ?? null,
        capacidad: validation.data.capacidad ?? 0,
        activa: validation.data.activa ?? true,
        bodegaId: validation.data.bodegaId,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json({ success: true, data: ubicacion, message: "Ubicación creada" }, { status: 201 });
  } catch (error) {
    console.error("Ubicaciones POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
