import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validations";

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

    if (session.rol !== "ADMIN" && session.rol !== "SUPERVISOR") {
      return NextResponse.json(
        { success: false, error: "No tienes permisos para modificar usuarios" },
        { status: 403 }
      );
    }

    const { id } = params;

    const existing = await prisma.user.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (existing.rol === "ADMIN" && session.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Solo un administrador puede modificar a otro administrador" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = userUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(validation.data.nombre !== undefined && { nombre: validation.data.nombre }),
        ...(validation.data.rol !== undefined && { rol: validation.data.rol }),
        ...(validation.data.estado !== undefined && { estado: validation.data.estado }),
        ...(validation.data.telefono !== undefined && { telefono: validation.data.telefono }),
        ...(validation.data.foto !== undefined && { foto: validation.data.foto }),
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
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: "Usuario actualizado exitosamente",
    });
  } catch (error) {
    console.error("Usuarios PUT error:", error);
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

    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede eliminar usuarios" },
        { status: 403 }
      );
    }

    const { id } = params;

    const existing = await prisma.user.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (existing.id === session.uid) {
      return NextResponse.json(
        { success: false, error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    console.error("Usuarios DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
