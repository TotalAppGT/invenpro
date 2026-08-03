export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";
import { sendInvitationEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede invitar usuarios" },
        { status: 403 }
      );
    }

    const limits = getPlanLimits(session.tenantPlan);
    if (limits.maxUsers !== 999999) {
      const currentCount = await prisma.user.count({
        where: { tenantId: session.tenantId, estado: "ACTIVO" },
      });
      if (currentCount >= limits.maxUsers) {
        return NextResponse.json(
          {
            success: false,
            error: `Has alcanzado el limite de ${limits.maxUsers} usuarios para tu plan ${session.tenantPlan}`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { email, nombre, rol } = body;

    if (!email || !nombre || !rol) {
      return NextResponse.json(
        { success: false, error: "Email, nombre y rol son obligatorios" },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "SUPERVISOR", "OPERADOR", "CONSULTOR"];
    if (!validRoles.includes(rol)) {
      return NextResponse.json(
        { success: false, error: "Rol no valido" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Formato de email invalido" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Ya existe un usuario con ese correo electronico" },
        { status: 400 }
      );
    }

    const tempPassword = Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10).replace(/[^a-zA-Z]/g, "") + "A1b";

    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        nombre,
        rol: rol as any,
        estado: "ACTIVO",
        tenantId: session.tenantId,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        estado: true,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const loginUrl = `${appUrl}/login`;

    await sendInvitationEmail({
      to: email,
      nombre,
      tenantName: tenant?.name ?? session.tenantName,
      invitedBy: session.nombre,
      acceptUrl: loginUrl,
    }).catch((emailErr) => {
      console.error("Failed to send invitation email:", emailErr);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          userId: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          tempPassword,
        },
        message: "Usuario creado e invitacion enviada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Usuarios invite POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
