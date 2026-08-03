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
        bodega: { select: { id: true, nombre: true } },
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

    if (conteo.estado !== "CERRADO") {
      return NextResponse.json(
        { success: false, error: "El conteo debe estar cerrado para conciliar" },
        { status: 400 }
      );
    }

    const diferencias = conteo.items.filter((i: { diferencia: number }) => i.diferencia !== 0);

    if (diferencias.length === 0) {
      const updated = await prisma.conteo.update({
        where: { id },
        data: { estado: "CONCILIADO" },
      });
      return NextResponse.json({
        success: true,
        data: { id: updated.id, estado: updated.estado },
        message: "Conteo conciliado sin diferencias",
      });
    }

    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      const movimientosCreados: unknown[] = [];

      for (const item of diferencias) {
        const costoUnit = Number(item.producto?.costoUnit ?? 0);

        let inventory = await tx.inventario.findUnique({
          where: {
            bodegaId_productoId_lote: {
              bodegaId: conteo.bodegaId,
              productoId: item.productoId,
              lote: "",
            },
          },
        });

        const cantAnterior = inventory?.cantidad ?? 0;

        if (inventory) {
          await tx.inventario.update({
            where: { id: inventory.id },
            data: { cantidad: item.cantidadFisica },
          });
        } else {
          await tx.inventario.create({
            data: {
              bodegaId: conteo.bodegaId,
              productoId: item.productoId,
              cantidad: item.cantidadFisica,
              lote: "",
            },
          });
        }

        const movimiento = await tx.movimiento.create({
          data: {
            tipo: "CONTEO_DIFERENCIA",
            fecha: new Date(),
            cantidad: item.diferencia,
            cantAnterior,
            cantNueva: item.cantidadFisica,
            costoUnit,
            total: item.diferencia * costoUnit,
            bodegaId: conteo.bodegaId,
            productoId: item.productoId,
            usuarioId: session.uid,
            notas: `Conciliación conteo #${conteo.id.slice(0, 8)}: ${item.producto?.nombre}`,
            referencia: conteo.id,
            tenantId: session.tenantId,
          },
          include: {
            producto: { select: { id: true, codigo: true, nombre: true } },
            bodega: { select: { id: true, nombre: true } },
          },
        });

        movimientosCreados.push({
          id: movimiento.id,
          tipo: movimiento.tipo,
          producto: movimiento.producto,
          bodega: movimiento.bodega,
          cantidad: movimiento.cantidad,
          cantAnterior: movimiento.cantAnterior,
          cantNueva: movimiento.cantNueva,
          costoUnit: Number(movimiento.costoUnit ?? 0),
          total: Number(movimiento.total ?? 0),
        });
      }

      const updatedConteo = await tx.conteo.update({
        where: { id },
        data: { estado: "CONCILIADO" },
      });

      return { conteo: updatedConteo, movimientos: movimientosCreados };
    });

    return NextResponse.json({
      success: true,
      data: {
        conteo: {
          id: result.conteo.id,
          estado: result.conteo.estado,
        },
        movimientos: result.movimientos,
        totalDiferencias: diferencias.length,
      },
      message: `Conteo conciliado exitosamente. ${diferencias.length} diferencias ajustadas.`,
    });
  } catch (error) {
    console.error("Conteo conciliar error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
