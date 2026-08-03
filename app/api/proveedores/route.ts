export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { proveedorSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: "insensitive" } },
        { nit: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [total, proveedores] = await Promise.all([
      prisma.proveedor.count({ where }),
      prisma.proveedor.findMany({
        where,
        include: {
          _count: { select: { productos: true } },
        },
        orderBy: { nombre: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: proveedores.map((p: { id: string; nombre: string; nit: string | null; direccion: string | null; telefono: string | null; email: string | null; contacto: string | null; notas: string | null; _count: { productos: number }; createdAt: Date; updatedAt: Date }) => ({
        id: p.id,
        nombre: p.nombre,
        nit: p.nit,
        direccion: p.direccion,
        telefono: p.telefono,
        email: p.email,
        contacto: p.contacto,
        notas: p.notas,
        productosCount: p._count.productos,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
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
    console.error("Proveedores GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = proveedorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: validation.data.nombre,
        nit: validation.data.nit ?? null,
        direccion: validation.data.direccion ?? null,
        telefono: validation.data.telefono ?? null,
        email: validation.data.email || null,
        contacto: validation.data.contacto ?? null,
        notas: validation.data.notas ?? null,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: proveedor,
        message: "Proveedor creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Proveedores POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
