export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { encrypt } from "@/lib/auth";

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
        { success: false, error: "Acceso denegado. Se requiere rol de super administrador central." },
        { status: 403 }
      );
    }

    const [
      totalTenants,
      tenantsActivos,
      tenantsTrial,
      tenantsCancelados,
      totalUsers,
      totalRevenue,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: "ACTIVO" } }),
      prisma.tenant.count({ where: { status: "TRIAL" } }),
      prisma.tenant.count({ where: { status: "CANCELADO" } }),
      prisma.user.count(),
      prisma.tenant.aggregate({
        _count: { recurrenteSubscriptionId: true },
        where: { status: "ACTIVO" },
      }),
    ]);

    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { users: true, productos: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalTenants,
          activos: tenantsActivos,
          trial: tenantsTrial,
          cancelados: tenantsCancelados,
          totalUsers,
        },
        recentTenants: recentTenants.map((t: { id: string; name: string; slug: string; plan: string; status: string; _count: { users: number; productos: number }; createdAt: Date }) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          status: t.status,
          usersCount: t._count.users,
          productsCount: t._count.productos,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
