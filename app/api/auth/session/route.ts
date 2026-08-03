import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, error: "No autenticado" },
        { status: 401 }
      );
    }

    const payload = await getSessionFromCookie(sessionCookie.value);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Sesión inválida o expirada" },
        { status: 401 }
      );
    }

    const isSuperAdmin = payload.email === "totalappgt@gmail.com" && payload.rol === "ADMIN";

    if (isSuperAdmin) {
      const adminUser = await prisma.user.findFirst({
        where: { id: payload.uid as string },
        include: { tenant: true },
      });

      if (!adminUser) {
        return NextResponse.json(
          { success: false, error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          nombre: adminUser.nombre,
          rol: adminUser.rol,
          estado: adminUser.estado,
          foto: adminUser.foto,
          telefono: adminUser.telefono,
          ultimoAcceso: adminUser.ultimoAcceso,
          tenantId: adminUser.tenantId,
          tenantInfo: {
            id: adminUser.tenant.id,
            name: adminUser.tenant.name,
            slug: adminUser.tenant.slug,
            plan: adminUser.tenant.plan,
            status: adminUser.tenant.status,
          },
        },
        tenant: {
          id: adminUser.tenant.id,
          name: adminUser.tenant.name,
          slug: adminUser.tenant.slug,
          plan: adminUser.tenant.plan,
          status: adminUser.tenant.status,
          trialEndsAt: adminUser.tenant.trialEndsAt,
          config: adminUser.tenant.config,
        },
        isSuperAdmin: true,
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.uid as string,
        tenantId: payload.tenantId as string,
        estado: "ACTIVO",
      },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado o desactivado" },
        { status: 404 }
      );
    }

    if (user.tenant.status === "CANCELADO") {
      return NextResponse.json(
        { success: false, error: "La suscripción de tu empresa ha sido cancelada." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        estado: user.estado,
        foto: user.foto,
        telefono: user.telefono,
        ultimoAcceso: user.ultimoAcceso,
        tenantId: user.tenantId,
        tenantInfo: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          status: user.tenant.status,
        },
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        status: user.tenant.status,
        trialEndsAt: user.tenant.trialEndsAt,
        config: user.tenant.config,
      },
      isSuperAdmin: false,
    });
  } catch (error) {
    console.error("Auth GET /api/auth/session error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
