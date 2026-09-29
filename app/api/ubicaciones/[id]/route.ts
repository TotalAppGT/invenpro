export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { ubicacionSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.ubicacion.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Ubicación no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validation = ubicacionSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const data = validation.data;
    const ubicacion = await prisma.ubicacion.update({
      where: { id: params.id },
      data: {
        ...(data.codigo !== undefined ? { codigo: data.codigo } : {}),
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
        ...(data.pasillo !== undefined ? { pasillo: data.pasillo } : {}),
        ...(data.rack !== undefined ? { rack: data.rack } : {}),
        ...(data.nivel !== undefined ? { nivel: data.nivel } : {}),
        ...(data.posicion !== undefined ? { posicion: data.posicion } : {}),
        ...(data.capacidad !== undefined ? { capacidad: data.capacidad } : {}),
        ...(data.activa !== undefined ? { activa: data.activa } : {}),
      },
    });

    return NextResponse.json({ success: true, data: ubicacion, message: "Ubicación actualizada" });
  } catch (error) {
    console.error("Ubicacion PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.ubicacion.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Ubicación no encontrada" }, { status: 404 });
    }

    const conStock = await prisma.inventario.count({ where: { ubicacionId: params.id, cantidad: { gt: 0 } } });
    if (conStock > 0) {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar: la ubicación tiene inventario asignado" },
        { status: 400 }
      );
    }

    await prisma.ubicacion.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Ubicación eliminada" });
  } catch (error) {
    console.error("Ubicacion DELETE error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
