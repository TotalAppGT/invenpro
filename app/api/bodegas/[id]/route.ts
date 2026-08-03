import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { bodegaSchema } from "@/lib/validations";

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

    const { id } = params;

    const existing = await prisma.bodega.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = bodegaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const bodega = await prisma.bodega.update({
      where: { id },
      data: {
        nombre: validation.data.nombre,
        direccion: validation.data.direccion ?? null,
        telefono: validation.data.telefono ?? null,
        encargado: validation.data.encargado ?? null,
        activa: validation.data.activa ?? existing.activa,
      },
    });

    return NextResponse.json({
      success: true,
      data: bodega,
      message: "Bodega actualizada exitosamente",
    });
  } catch (error) {
    console.error("Bodegas PUT error:", error);
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

    const { id } = params;

    const bodega = await prisma.bodega.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!bodega) {
      return NextResponse.json(
        { success: false, error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const hasInventory = await prisma.inventario.findFirst({
      where: { bodegaId: id, cantidad: { gt: 0 } },
    });

    if (hasInventory) {
      const updated = await prisma.bodega.update({
        where: { id },
        data: { activa: false },
      });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "La bodega tiene inventario activo. Se ha desactivado en lugar de eliminar.",
      });
    }

    await prisma.bodega.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Bodega eliminada exitosamente",
    });
  } catch (error) {
    console.error("Bodegas DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
