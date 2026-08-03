export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { id: session.uid, tenantId: session.tenantId },
    });
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acceso denegado" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const plan = searchParams.get("plan") ?? "";
    const status = searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = {};

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (plan && ["EMPRENDEDOR", "NEGOCIO", "CORPORATIVO"].includes(plan)) {
      where.plan = plan;
    }
    if (status && ["ACTIVO", "SUSPENDIDO", "CANCELADO", "TRIAL"].includes(status)) {
      where.status = status;
    }

    const [total, tenants] = await Promise.all([
      prisma.tenant.count({ where }),
      prisma.tenant.findMany({
        where,
        include: {
          _count: {
            select: { users: true, productos: true, bodegas: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: tenants.map((t: { id: string; name: string; slug: string; plan: string; status: string; recurrenteCustomerId: string | null; trialEndsAt: Date | null; _count: { users: number; productos: number; bodegas: number }; createdAt: Date; updatedAt: Date }) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        recurrenteCustomerId: t.recurrenteCustomerId,
        trialEndsAt: t.trialEndsAt,
        usersCount: t._count.users,
        productsCount: t._count.productos,
        bodegasCount: t._count.bodegas,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
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
    console.error("Admin tenants GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
