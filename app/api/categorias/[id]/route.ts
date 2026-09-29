export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { categoriaSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.categoria.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!existing) return NextResponse.json({ success: false, error: "Categoría no encontrada" }, { status: 404 });

    const body = await request.json();
    const validation = categoriaSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const categoria = await prisma.categoria.update({
      where: { id: params.id },
      data: {
        ...(validation.data.nombre !== undefined ? { nombre: validation.data.nombre } : {}),
        ...(validation.data.descripcion !== undefined ? { descripcion: validation.data.descripcion } : {}),
      },
    });

    return NextResponse.json({ success: true, data: categoria, message: "Categoría actualizada" });
  } catch (error) {
    console.error("Categoria PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.categoria.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!existing) return NextResponse.json({ success: false, error: "Categoría no encontrada" }, { status: 404 });

    const productos = await prisma.producto.count({ where: { categoriaId: params.id } });
    if (productos > 0) {
      return NextResponse.json(
        { success: false, error: `No se puede eliminar: la categoría tiene ${productos} producto(s)` },
        { status: 400 }
      );
    }

    await prisma.categoria.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Categoría eliminada" });
  } catch (error) {
    console.error("Categoria DELETE error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
