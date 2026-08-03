import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, isSuperAdminEmail, hashPassword, comparePassword } from "@/lib/auth";
import { Rol, Plan, TenantStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const isSuperAdmin = isSuperAdminEmail(email);

    if (isSuperAdmin) {
      let adminTenant = await prisma.tenant.findUnique({
        where: { slug: "admin-central" },
      });

      if (!adminTenant) {
        adminTenant = await prisma.tenant.create({
          data: {
            name: "TotalAppGT Admin Central",
            slug: "admin-central",
            plan: Plan.CORPORATIVO,
            status: TenantStatus.ACTIVO,
            config: {
              moneda: "GTQ",
              zonaHoraria: "America/Guatemala",
              impuesto: 12,
              redondeo: 2,
              website: "https://totalappgt.com",
              email: "totalappgt@gmail.com",
            },
          },
        });
      }

      let adminUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!adminUser) {
        const hashedPassword = await hashPassword("admintotal");
        adminUser = await prisma.user.create({
          data: {
            email,
            passwordHash: hashedPassword,
            nombre: "Administrador TotalAppGT",
            rol: Rol.ADMIN,
            estado: "ACTIVO",
            tenantId: adminTenant.id,
            telefono: "58303182",
          },
        });
      }

      if (adminUser.passwordHash) {
        const valid = await comparePassword(password, adminUser.passwordHash);
        if (!valid) {
          return NextResponse.json(
            { success: false, error: "Credenciales inválidas" },
            { status: 401 }
          );
        }
      }

      await prisma.user.update({
        where: { id: adminUser.id },
        data: { ultimoAcceso: new Date() },
      });

      await createSession({
        id: adminUser.id,
        email: adminUser.email,
        tenantId: adminTenant.id,
        tenantSlug: adminTenant.slug,
        tenantName: adminTenant.name,
        tenantPlan: adminTenant.plan,
        tenantStatus: adminTenant.status,
        nombre: adminUser.nombre,
        rol: adminUser.rol,
        foto: adminUser.foto,
      });

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
          tenantId: adminUser.tenantId,
          tenantInfo: {
            id: adminTenant.id,
            name: adminTenant.name,
            slug: adminTenant.slug,
            plan: adminTenant.plan,
            status: adminTenant.status,
          },
        },
        tenant: {
          id: adminTenant.id,
          name: adminTenant.name,
          slug: adminTenant.slug,
          plan: adminTenant.plan,
          status: adminTenant.status,
          trialEndsAt: adminTenant.trialEndsAt,
        },
        isSuperAdmin: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (user.estado !== "ACTIVO") {
      return NextResponse.json(
        { success: false, error: "Tu cuenta está desactivada. Contacta al administrador." },
        { status: 403 }
      );
    }

    if (user.tenant.status === "CANCELADO") {
      return NextResponse.json(
        { success: false, error: "La suscripción de tu empresa ha sido cancelada." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { ultimoAcceso: new Date() },
    });

    await createSession({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      tenantName: user.tenant.name,
      tenantPlan: user.tenant.plan,
      tenantStatus: user.tenant.status,
      nombre: user.nombre,
      rol: user.rol,
      foto: user.foto,
    });

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
      },
      isSuperAdmin: false,
    });
  } catch (error) {
    console.error("Auth POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
