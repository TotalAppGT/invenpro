export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { listaPrecioSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.listaPrecio.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lista no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const validation = listaPrecioSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const lista = await prisma.$transaction(async (tx) => {
      if (data.esDefecto) {
        await tx.listaPrecio.updateMany({
          where: { tenantId: session.tenantId, id: { not: params.id } },
          data: { esDefecto: false },
        });
      }
      return tx.listaPrecio.update({
        where: { id: params.id },
        data: {
          ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
          ...(data.tipo !== undefined ? { tipo: data.tipo } : {}),
          ...(data.moneda !== undefined ? { moneda: data.moneda } : {}),
          ...(data.margen !== undefined ? { margen: data.margen } : {}),
          ...(data.esDefecto !== undefined ? { esDefecto: data.esDefecto } : {}),
          ...(data.activa !== undefined ? { activa: data.activa } : {}),
        },
      });
    });

    return NextResponse.json({ success: true, data: lista, message: "Lista actualizada" });
  } catch (error) {
    console.error("Lista precio PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.listaPrecio.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Lista no encontrada" }, { status: 404 });
    }
    if (existing.esDefecto) {
      return NextResponse.json({ success: false, error: "No se puede eliminar la lista por defecto" }, { status: 400 });
    }

    await prisma.listaPrecio.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Lista eliminada" });
  } catch (error) {
    console.error("Lista precio DELETE error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
