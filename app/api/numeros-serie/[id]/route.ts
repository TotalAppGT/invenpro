export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.numeroSerie.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Serie no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const allowedEstados = ["DISPONIBLE", "RESERVADO", "VENDIDO", "BAJA"];

    const serie = await prisma.numeroSerie.update({
      where: { id: params.id },
      data: {
        ...(body.estado && allowedEstados.includes(body.estado) ? { estado: body.estado } : {}),
        ...(body.ubicacionId !== undefined ? { ubicacionId: body.ubicacionId || null } : {}),
        ...(body.notas !== undefined ? { notas: body.notas ?? null } : {}),
      },
    });

    return NextResponse.json({ success: true, data: serie, message: "Serie actualizada" });
  } catch (error) {
    console.error("Numero serie PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.numeroSerie.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Serie no encontrada" }, { status: 404 });
    }

    await prisma.numeroSerie.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Serie eliminada" });
  } catch (error) {
    console.error("Numero serie DELETE error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
