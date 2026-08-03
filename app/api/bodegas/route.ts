export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits } from "@/lib/auth";
import { bodegaSchema } from "@/lib/validations";

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
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (search.trim()) {
      where.nombre = { contains: search.trim(), mode: "insensitive" };
    }
    if (status === "activa") {
      where.activa = true;
    } else if (status === "inactiva") {
      where.activa = false;
    }

    const [total, bodegas] = await Promise.all([
      prisma.bodega.count({ where }),
      prisma.bodega.findMany({
        where,
        include: {
          _count: {
            select: { inventarios: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: bodegas.map((b: { id: string; nombre: string; direccion: string | null; telefono: string | null; encargado: string | null; activa: boolean; _count: { inventarios: number }; createdAt: Date; updatedAt: Date }) => ({
        id: b.id,
        nombre: b.nombre,
        direccion: b.direccion,
        telefono: b.telefono,
        encargado: b.encargado,
        activa: b.activa,
        inventarioCount: b._count.inventarios,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
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
    console.error("Bodegas GET error:", error);
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

    const limits = getPlanLimits(session.tenantPlan);
    if (limits.maxBodegas !== Infinity) {
      const currentCount = await prisma.bodega.count({
        where: { tenantId: session.tenantId },
      });
      if (currentCount >= limits.maxBodegas) {
        return NextResponse.json(
          {
            success: false,
            error: `Has alcanzado el límite de ${limits.maxBodegas} bodegas para tu plan ${session.tenantPlan}`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validation = bodegaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const bodega = await prisma.bodega.create({
      data: {
        nombre: validation.data.nombre,
        direccion: validation.data.direccion ?? null,
        telefono: validation.data.telefono ?? null,
        encargado: validation.data.encargado ?? null,
        activa: validation.data.activa ?? true,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: bodega,
        message: "Bodega creada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bodegas POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
