export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { listaPrecioSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (search.trim()) where.nombre = { contains: search.trim(), mode: "insensitive" };

    const listas = await prisma.listaPrecio.findMany({
      where,
      include: { _count: { select: { precios: true, clientes: true } } },
      orderBy: [{ esDefecto: "desc" }, { nombre: "asc" }],
    });

    const data = listas.map((l: any) => ({
      id: l.id,
      nombre: l.nombre,
      tipo: l.tipo,
      moneda: l.moneda,
      margen: Number(l.margen),
      esDefecto: l.esDefecto,
      activa: l.activa,
      productosCount: l._count.precios,
      clientesCount: l._count.clientes,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Listas precio GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = listaPrecioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const data = validation.data;

    const lista = await prisma.$transaction(async (tx) => {
      if (data.esDefecto) {
        await tx.listaPrecio.updateMany({
          where: { tenantId: session.tenantId },
          data: { esDefecto: false },
        });
      }
      return tx.listaPrecio.create({
        data: {
          nombre: data.nombre,
          tipo: data.tipo,
          moneda: data.moneda ?? "GTQ",
          margen: data.margen ?? 0,
          esDefecto: data.esDefecto ?? false,
          activa: data.activa ?? true,
          tenantId: session.tenantId,
        },
      });
    });

    return NextResponse.json({ success: true, data: lista, message: "Lista de precios creada" }, { status: 201 });
  } catch (error) {
    console.error("Listas precio POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
