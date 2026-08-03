export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validations";

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

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + "!1";
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
            error: `Has alcanzado el limite de ${limits.maxUsers} usuarios para tu plan ${session.tenantPlan}`,
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
        { success: false, error: "Ya existe un usuario con ese correo electronico" },
        { status: 400 }
      );
    }

    const tempPassword = generatePassword();
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
    });

    return NextResponse.json(
      {
        success: true,
        data: user,
        tempPassword,
        message: "Usuario creado exitosamente",
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
