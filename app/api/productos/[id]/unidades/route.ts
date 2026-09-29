export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { productoUnidadesSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const producto = await prisma.producto.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!producto) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const unidades = await prisma.productoUnidad.findMany({
      where: { productoId: params.id },
      orderBy: [{ esBase: "desc" }, { factor: "asc" }],
    });

    return NextResponse.json({ success: true, data: unidades });
  } catch (error) {
    console.error("Producto unidades GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const producto = await prisma.producto.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!producto) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const validation = productoUnidadesSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const unidades = validation.data.unidades;
    const bases = unidades.filter((u) => u.esBase);
    if (bases.length !== 1) {
      return NextResponse.json({ success: false, error: "Debe existir exactamente una unidad base" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.productoUnidad.deleteMany({ where: { productoId: params.id } });
      await tx.productoUnidad.createMany({
        data: unidades.map((u) => ({
          productoId: params.id,
          nombre: u.nombre,
          abreviatura: u.abreviatura,
          factor: u.factor,
          codigoBarras: u.codigoBarras ?? null,
          esBase: u.esBase ?? false,
        })),
      });
      const base = bases[0];
      await tx.producto.update({
        where: { id: params.id },
        data: { unidadMedida: base.abreviatura.toUpperCase() },
      });
      return tx.productoUnidad.findMany({
        where: { productoId: params.id },
        orderBy: [{ esBase: "desc" }, { factor: "asc" }],
      });
    });

    return NextResponse.json({ success: true, data: result, message: "Unidades actualizadas" });
  } catch (error) {
    console.error("Producto unidades PUT error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
