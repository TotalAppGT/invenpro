import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, isSuperAdminEmail, hashPassword } from "@/lib/auth";
import { Rol, Plan, TenantStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, nombre, companyName, plan } = body;

    if (!email || !password || !companyName || !nombre) {
      return NextResponse.json(
        { success: false, error: "email, password, nombre y companyName son obligatorios" },
        { status: 400 }
      );
    }

    if (isSuperAdminEmail(email)) {
      return NextResponse.json(
        { success: false, error: "No se puede registrar el Super Admin usando esta ruta." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Ya existe una cuenta con este correo electrónico." },
        { status: 409 }
      );
    }

    const validPlans: Plan[] = [Plan.EMPRENDEDOR, Plan.NEGOCIO, Plan.CORPORATIVO];
    const selectedPlan = validPlans.includes(plan as Plan) ? (plan as Plan) : Plan.EMPRENDEDOR;

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) + "-" + Math.random().toString(36).slice(2, 8);

    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { success: false, error: "El nombre de empresa ya está en uso. Intenta con otro." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        plan: selectedPlan,
        status: TenantStatus.TRIAL,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        config: {
          moneda: "GTQ",
          zonaHoraria: "America/Guatemala",
          impuesto: 12,
          redondeo: 2,
        },
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nombre: nombre,
        rol: Rol.ADMIN,
        estado: "ACTIVO",
        tenantId: tenant.id,
      },
      include: { tenant: true },
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
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
      },
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
    });
  } catch (error) {
    console.error("Auth POST /api/auth/register error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
