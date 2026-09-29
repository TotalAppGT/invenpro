export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { clienteSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.cliente.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!existing) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

    const body = await request.json();
    const validation = clienteSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const cliente = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.nit !== undefined ? { nit: data.nit } : {}),
        ...(data.direccion !== undefined ? { direccion: data.direccion } : {}),
        ...(data.telefono !== undefined ? { telefono: data.telefono } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.contacto !== undefined ? { contacto: data.contacto } : {}),
        ...(data.listaPrecioId !== undefined ? { listaPrecioId: data.listaPrecioId || null } : {}),
        ...(data.limiteCredito !== undefined ? { limiteCredito: data.limiteCredito } : {}),
        ...(data.diasCredito !== undefined ? { diasCredito: data.diasCredito } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
        ...(data.notas !== undefined ? { notas: data.notas } : {}),
      },
    });

    return NextResponse.json({ success: true, data: cliente, message: "Cliente actualizado" });
  } catch (error) {
    console.error("Cliente PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const existing = await prisma.cliente.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!existing) return NextResponse.json({ success: false, error: "Cliente no encontrado" }, { status: 404 });

    const ventas = await prisma.venta.count({ where: { clienteId: params.id } });
    if (ventas > 0) {
      const cliente = await prisma.cliente.update({ where: { id: params.id }, data: { activo: false } });
      return NextResponse.json({ success: true, data: cliente, message: "Cliente con ventas: se desactivó en lugar de eliminar" });
    }

    await prisma.cliente.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "Cliente eliminado" });
  } catch (error) {
    console.error("Cliente DELETE error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
