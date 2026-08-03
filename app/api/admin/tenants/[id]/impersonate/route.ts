import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, encrypt } from "@/lib/auth";

export async function POST(
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
        { success: false, error: "Acceso denegado. Solo super administradores pueden impersonar." },
        { status: 403 }
      );
    }

    const { id } = params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          where: { rol: "ADMIN", estado: "ACTIVO" },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    const targetUser = tenant.users[0];
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "El tenant no tiene un usuario administrador activo" },
        { status: 400 }
      );
    }

    const impersonationPayload = {
      uid: targetUser.id,
      email: targetUser.email,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      tenantPlan: tenant.plan,
      tenantStatus: tenant.status,
      nombre: targetUser.nombre,
      rol: targetUser.rol,
      photo: targetUser.foto,
      impersonatedBy: session.uid,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };

    const token = await encrypt(impersonationPayload);

    return NextResponse.json({
      success: true,
      data: {
        token,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
        },
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          nombre: targetUser.nombre,
          rol: targetUser.rol,
        },
        expiresIn: "1 hora",
      },
      message: `Token de impersonación creado para ${tenant.name}`,
    });
  } catch (error) {
    console.error("Admin impersonate error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
