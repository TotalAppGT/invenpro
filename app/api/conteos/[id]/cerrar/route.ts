import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { PrismaClient } from "@prisma/client";

export async function POST(
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

    const conteo = await prisma.conteo.findFirst({
      where: { id, tenantId: session.tenantId },
      include: {
        items: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true, costoUnit: true } },
          },
        },
      },
    });

    if (!conteo) {
      return NextResponse.json(
        { success: false, error: "Conteo no encontrado" },
        { status: 404 }
      );
    }

    if (conteo.estado === "CERRADO" || conteo.estado === "CONCILIADO") {
      return NextResponse.json(
        { success: false, error: "El conteo ya está cerrado o conciliado" },
        { status: 400 }
      );
    }

    const uncountedItems = conteo.items.filter((i: { cantidadFisica: number; cantidadSistema: number }) => i.cantidadFisica === 0 && i.cantidadSistema !== 0);
    if (uncountedItems.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Hay ${uncountedItems.length} productos sin contar. Todos los productos deben tener conteo físico.`,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.conteo.update({
      where: { id },
      data: {
        estado: "CERRADO",
        fechaFin: new Date(),
      },
      include: {
        bodega: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true, costoUnit: true } },
          },
        },
      },
    });

    const diferencias = updated.items.filter((i: { diferencia: number }) => i.diferencia !== 0);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        estado: updated.estado,
        fechaFin: updated.fechaFin,
        totalItems: updated.items.length,
        itemsConDiferencia: diferencias.length,
        diferencias: diferencias.map((i: { productoId: string; producto: { id: string; codigo: string; nombre: string; costoUnit: { valueOf(): number } | number } | null; cantidadSistema: number; cantidadFisica: number; diferencia: number }) => ({
          productoId: i.productoId,
          producto: i.producto,
          cantidadSistema: i.cantidadSistema,
          cantidadFisica: i.cantidadFisica,
          diferencia: i.diferencia,
          valorDiferencia: i.diferencia * Number(i.producto?.costoUnit ?? 0),
        })),
      },
      message: "Conteo cerrado exitosamente",
    });
  } catch (error) {
    console.error("Conteo cerrar error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
