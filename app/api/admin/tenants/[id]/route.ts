import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, encrypt } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { plan, status, name } = body;

    const updateData: Record<string, unknown> = {};

    if (plan && ["EMPRENDEDOR", "NEGOCIO", "CORPORATIVO"].includes(plan)) {
      updateData.plan = plan;
    }
    if (status && ["ACTIVO", "SUSPENDIDO", "CANCELADO", "TRIAL"].includes(status)) {
      updateData.status = status;
    }
    if (name && typeof name === "string" && name.trim().length >= 2) {
      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No se proporcionaron campos válidos para actualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { users: true, productos: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        status: updated.status,
        usersCount: updated._count.users,
        productsCount: updated._count.productos,
        updatedAt: updated.updatedAt,
      },
      message: "Tenant actualizado exitosamente",
    });
  } catch (error) {
    console.error("Admin tenants PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Tenant eliminado exitosamente. Todos sus datos han sido removidos.",
    });
  } catch (error) {
    console.error("Admin tenants DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
