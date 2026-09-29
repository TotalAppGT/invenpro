export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { productoPreciosSchema } from "@/lib/validations";

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

    const [precios, listas] = await Promise.all([
      prisma.productoPrecio.findMany({ where: { productoId: params.id } }),
      prisma.listaPrecio.findMany({ where: { tenantId: session.tenantId, activa: true }, orderBy: { nombre: "asc" } }),
    ]);

    const data = listas.map((l) => {
      const pp = precios.find((p) => p.listaPrecioId === l.id);
      return {
        listaPrecioId: l.id,
        lista: { id: l.id, nombre: l.nombre, tipo: l.tipo, moneda: l.moneda, esDefecto: l.esDefecto },
        precio: pp ? Number(pp.precio) : Number(producto.precioUnit),
        descuentoMax: pp ? Number(pp.descuentoMax) : 0,
        tienePrecio: !!pp,
      };
    });

    return NextResponse.json({ success: true, data: { precioBase: Number(producto.precioUnit), precios: data } });
  } catch (error) {
    console.error("Producto precios GET error:", error);
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
    const validation = productoPreciosSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const listasValidas = await prisma.listaPrecio.findMany({
      where: { tenantId: session.tenantId },
      select: { id: true },
    });
    const validIds = new Set(listasValidas.map((l) => l.id));

    await prisma.$transaction(async (tx) => {
      for (const p of validation.data.precios) {
        if (!validIds.has(p.listaPrecioId)) continue;
        await tx.productoPrecio.upsert({
          where: { productoId_listaPrecioId: { productoId: params.id, listaPrecioId: p.listaPrecioId } },
          create: {
            productoId: params.id,
            listaPrecioId: p.listaPrecioId,
            precio: p.precio,
            descuentoMax: p.descuentoMax ?? 0,
          },
          update: { precio: p.precio, descuentoMax: p.descuentoMax ?? 0 },
        });
      }
    });

    return NextResponse.json({ success: true, message: "Precios actualizados" });
  } catch (error) {
    console.error("Producto precios PUT error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
