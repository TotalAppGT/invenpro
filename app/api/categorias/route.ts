export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { categoriaSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "200", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (search.trim()) where.nombre = { contains: search.trim(), mode: "insensitive" };

    const categorias = await prisma.categoria.findMany({
      where,
      include: { _count: { select: { productos: true } } },
      orderBy: { nombre: "asc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: categorias.map((c: { id: string; nombre: string; descripcion: string | null; _count: { productos: number }; createdAt: Date }) => ({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        productosCount: c._count.productos,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Categorias GET error:", error);
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
    const validation = categoriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const existente = await prisma.categoria.findFirst({
      where: { tenantId: session.tenantId, nombre: validation.data.nombre },
    });
    if (existente) {
      return NextResponse.json({ success: true, data: existente, message: "La categoría ya existía" });
    }

    const categoria = await prisma.categoria.create({
      data: {
        nombre: validation.data.nombre,
        descripcion: validation.data.descripcion ?? null,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json({ success: true, data: categoria, message: "Categoría creada" }, { status: 201 });
  } catch (error) {
    console.error("Categorias POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
