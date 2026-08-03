export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits, hashPassword } from "@/lib/auth";
import { userCreateSchema, userUpdateSchema } from "@/lib/validations";
import { sendInvitationEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    if (session.rol !== "ADMIN" && session.rol !== "SUPERVISOR") {
      return NextResponse.json(
        { success: false, error: "No tienes permisos para ver usuarios" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const rol = searchParams.get("rol") ?? "";
    const estado = searchParams.get("estado") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (rol === "ADMIN" || rol === "SUPERVISOR" || rol === "OPERADOR" || rol === "CONSULTOR") {
      where.rol = rol;
    }
    if (estado === "ACTIVO" || estado === "INACTIVO") {
      where.estado = estado;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true,
          estado: true,
          telefono: true,
          foto: true,
          ultimoAcceso: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
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
    console.error("Usuarios GET error:", error);
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

    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede crear usuarios" },
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
            error: `Has alcanzado el límite de ${limits.maxUsers} usuarios para tu plan ${session.tenantPlan}`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validation = userCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Ya existe un usuario con ese correo electrónico" },
        { status: 400 }
      );
    }

    const tempPassword = Math.random().toString(36).slice(-10) + "A1b";
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email: validation.data.email,
        passwordHash: hashedPassword,
        nombre: validation.data.nombre,
        rol: validation.data.rol,
        estado: "ACTIVO",
        telefono: validation.data.telefono ?? null,
        tenantId: session.tenantId,
      },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { name: true },
    });

    const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login`;

    await sendInvitationEmail({
      to: validation.data.email,
      nombre: validation.data.nombre,
      tenantName: tenant?.name ?? session.tenantName,
      invitedBy: session.nombre,
      acceptUrl,
    }).catch((emailErr) => {
      console.error("Failed to send invitation email:", emailErr);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          estado: user.estado,
        },
        message: "Usuario creado e invitación enviada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Usuarios POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
