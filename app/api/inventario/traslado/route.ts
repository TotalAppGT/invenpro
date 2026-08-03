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
    const { productoId, bodegaOrigenId, bodegaDestinoId, cantidad, motivo } = body;

    if (!productoId || !bodegaOrigenId || !bodegaDestinoId || !cantidad) {
      return NextResponse.json(
        {
          success: false,
          error: "productoId, bodegaOrigenId, bodegaDestinoId y cantidad son obligatorios",
        },
        { status: 400 }
      );
    }

    if (bodegaOrigenId === bodegaDestinoId) {
      return NextResponse.json(
        { success: false, error: "La bodega de origen y destino deben ser diferentes" },
        { status: 400 }
      );
    }

    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser un número entero mayor a 0" },
        { status: 400 }
      );
    }

    const [producto, bodegaOrigen, bodegaDestino] = await Promise.all([
      prisma.producto.findFirst({
        where: { id: productoId, tenantId: session.tenantId },
      }),
      prisma.bodega.findFirst({
        where: { id: bodegaOrigenId, tenantId: session.tenantId },
      }),
      prisma.bodega.findFirst({
        where: { id: bodegaDestinoId, tenantId: session.tenantId },
      }),
    ]);

    if (!producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    if (!bodegaOrigen) {
      return NextResponse.json(
        { success: false, error: "Bodega de origen no encontrada" },
        { status: 404 }
      );
    }
    if (!bodegaDestino) {
      return NextResponse.json(
        { success: false, error: "Bodega de destino no encontrada" },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      const inventarioOrigen = await tx.inventario.findUnique({
        where: {
          bodegaId_productoId_lote: {
            bodegaId: bodegaOrigenId,
            productoId,
            lote: "",
          },
        },
      });

      if (!inventarioOrigen || inventarioOrigen.cantidad < cantidadNum) {
        throw new Error(
          `Stock insuficiente en ${bodegaOrigen.nombre}. Disponible: ${inventarioOrigen?.cantidad ?? 0}, Solicitado: ${cantidadNum}`
        );
      }

      const costoUnitNum = Number(producto.costoUnit);

      await tx.inventario.update({
        where: { id: inventarioOrigen.id },
        data: { cantidad: inventarioOrigen.cantidad - cantidadNum },
      });

      let inventarioDestino = await tx.inventario.findUnique({
        where: {
          bodegaId_productoId_lote: {
            bodegaId: bodegaDestinoId,
            productoId,
            lote: "",
          },
        },
      });

      if (inventarioDestino) {
        await tx.inventario.update({
          where: { id: inventarioDestino.id },
          data: { cantidad: inventarioDestino.cantidad + cantidadNum },
        });
      } else {
        await tx.inventario.create({
          data: {
            bodegaId: bodegaDestinoId,
            productoId,
            cantidad: cantidadNum,
            lote: "",
          },
        });
      }

      await tx.movimiento.create({
        data: {
          tipo: "SALIDA",
          fecha: new Date(),
          cantidad: cantidadNum,
          cantAnterior: inventarioOrigen.cantidad,
          cantNueva: inventarioOrigen.cantidad - cantidadNum,
          costoUnit: costoUnitNum,
          total: cantidadNum * costoUnitNum,
          bodegaId: bodegaOrigenId,
          bodegaDestinoId,
          productoId,
          usuarioId: session.uid,
          notas: motivo || `Traslado de ${bodegaOrigen.nombre} a ${bodegaDestino.nombre}`,
          tenantId: session.tenantId,
        },
      });

      const destinoFinal = await tx.inventario.findUnique({
        where: {
          bodegaId_productoId_lote: {
            bodegaId: bodegaDestinoId,
            productoId,
            lote: "",
          },
        },
      });

      const movimientoEntrada = await tx.movimiento.create({
        data: {
          tipo: "ENTRADA",
          fecha: new Date(),
          cantidad: cantidadNum,
          cantAnterior: (destinoFinal?.cantidad ?? 0) - cantidadNum,
          cantNueva: destinoFinal?.cantidad ?? cantidadNum,
          costoUnit: costoUnitNum,
          total: cantidadNum * costoUnitNum,
          bodegaId: bodegaDestinoId,
          bodegaDestinoId: bodegaOrigenId,
          productoId,
          usuarioId: session.uid,
          notas: `Recepción de traslado desde ${bodegaOrigen.nombre}`,
          tenantId: session.tenantId,
        },
        include: {
          producto: { select: { nombre: true, codigo: true } },
          bodega: { select: { nombre: true } },
          bodegaDestino: { select: { nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      });

      return movimientoEntrada;
    });

    return NextResponse.json({
      success: true,
      data: {
        movimiento: {
          id: result.id,
          tipo: result.tipo,
          cantidad: result.cantidad,
          producto: result.producto,
          bodegaOrigen: { id: bodegaOrigenId, nombre: bodegaOrigen.nombre },
          bodegaDestino: { id: bodegaDestinoId, nombre: bodegaDestino.nombre },
          usuario: result.usuario,
          notas: result.notas,
          fecha: result.fecha,
        },
      },
      message: "Traslado realizado exitosamente",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stock insuficiente")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("Inventario traslado error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
