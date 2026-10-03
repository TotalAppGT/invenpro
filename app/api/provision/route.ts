import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const PLAN_MAP: Record<string, "EMPRENDEDOR" | "NEGOCIO" | "CORPORATIVO"> = {
  basico: "EMPRENDEDOR",
  pro: "NEGOCIO",
  empresarial: "CORPORATIVO",
};

// Alta automatica de empresa (Total Suite). Protegido por PROVISION_SECRET.
export async function POST(req: NextRequest) {
  if (req.headers.get("x-provision-secret") !== (process.env.PROVISION_SECRET || "__none__")) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({} as any));
  const nombre = b?.nombre;
  const adminEmail = b?.admin_email;
  const adminPassword = b?.admin_password;
  if (!nombre || !adminEmail || !adminPassword) {
    return NextResponse.json({ ok: false, error: "faltan datos" }, { status: 400 });
  }
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: nombre,
        slug: b.slug || `t-${Date.now().toString(36)}`,
        plan: PLAN_MAP[String(b.plan || "basico").toLowerCase()] || "EMPRENDEDOR",
        status: "ACTIVO",
      },
    });
    try {
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: String(adminEmail).toLowerCase(),
          passwordHash: await hashPassword(adminPassword),
          nombre,
          rol: "ADMIN",
          estado: "ACTIVO",
        },
      });
    } catch {
      // correo ya existia; la empresa quedo creada igual
    }
    return NextResponse.json({ ok: true, tenant_id: tenant.id, slug: tenant.slug });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 });
  }
}
