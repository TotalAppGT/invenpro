export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { PrismaClient } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productoId, bodegaId, cantidad, costoUnit, motivo } = body;

    if (!productoId || !bodegaId || cantidad === undefined || cantidad === null) {
      return NextResponse.json(
        { success: false, error: "productoId, bodegaId y cantidad son obligatorios" },
        { status: 400 }
      );
    }

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum < 0) {
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser un número entero mayor o igual a 0" },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findFirst({
      where: { id: productoId, tenantId: session.tenantId },
    });

    if (!producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const bodega = await prisma.bodega.findFirst({
      where: { id: bodegaId, tenantId: session.tenantId },
    });

    if (!bodega) {
      return NextResponse.json(
        { success: false, error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const costoUnitNum = costoUnit !== undefined ? parseFloat(costoUnit) : Number(producto.costoUnit);

    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      let inventory = await tx.inventario.findUnique({
        where: {
          bodegaId_productoId_lote: {
            bodegaId,
            productoId,
            lote: "",
          },
        },
      });

      const cantAnterior = inventory?.cantidad ?? 0;

      if (inventory) {
        inventory = await tx.inventario.update({
          where: { id: inventory.id },
          data: { cantidad: cantidadNum },
        });
      } else {
        inventory = await tx.inventario.create({
          data: {
            bodegaId,
            productoId,
            cantidad: cantidadNum,
            lote: "",
          },
        });
      }

      const movimiento = await tx.movimiento.create({
        data: {
          tipo: "AJUSTE",
          fecha: new Date(),
          cantidad: cantidadNum - cantAnterior,
          cantAnterior,
          cantNueva: cantidadNum,
          costoUnit: costoUnitNum,
          total: (cantidadNum - cantAnterior) * costoUnitNum,
          bodegaId,
          productoId,
          usuarioId: session.uid,
          notas: motivo || "Ajuste manual de inventario",
          tenantId: session.tenantId,
        },
        include: {
          producto: { select: { nombre: true, codigo: true } },
          bodega: { select: { nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      });

      return { inventory, movimiento };
    });

    return NextResponse.json({
      success: true,
      data: {
        inventario: {
          id: result.inventory.id,
          bodegaId: result.inventory.bodegaId,
          productoId: result.inventory.productoId,
          cantidad: result.inventory.cantidad,
          ultimaActualizacion: result.inventory.ultimaActualizacion,
        },
        movimiento: {
          id: result.movimiento.id,
          tipo: result.movimiento.tipo,
          cantidad: result.movimiento.cantidad,
          cantAnterior: result.movimiento.cantAnterior,
          cantNueva: result.movimiento.cantNueva,
          producto: result.movimiento.producto,
          bodega: result.movimiento.bodega,
          usuario: result.movimiento.usuario,
          notas: result.movimiento.notas,
          fecha: result.movimiento.fecha,
        },
      },
      message: "Ajuste de inventario realizado exitosamente",
    });
  } catch (error) {
    console.error("Inventario ajuste error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
