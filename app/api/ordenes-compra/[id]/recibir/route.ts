import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { PrismaClient } from "@prisma/client";

type OrdenItemRow = { id: string; productoId: string; cantidad: number; precioUnit: number; cantidadRecibida: number; [key: string]: unknown };

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

    const ordenResult = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "OrdenCompra" WHERE "id" = $1 AND "tenantId" = $2`,
      id,
      session.tenantId
    ) as Array<{ estado: string }>;

    if (!ordenResult || ordenResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    const orden = ordenResult[0];
    if (orden.estado === "COMPLETADA" || orden.estado === "CANCELADA") {
      return NextResponse.json(
        { success: false, error: "No se puede recibir una orden completada o cancelada" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, bodegaId } = body;

    if (!bodegaId) {
      return NextResponse.json(
        { success: false, error: "bodegaId es obligatorio para recibir productos" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe especificar los items a recibir" },
        { status: 400 }
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

    const ordenItemsRaw = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "OrdenCompraItem" WHERE "ordenCompraId" = $1`,
      id
    ) as OrdenItemRow[];

    const itemsMap = new Map<string, OrdenItemRow>(
      ordenItemsRaw.map((i: OrdenItemRow) => [i.productoId as string, i])
    );

    const result = await prisma.$transaction(
      async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
        const movimientosCreados: unknown[] = [];
        let allComplete = true;

        for (const received of items as Array<{ productoId: string; cantidad: string | number; precioUnit?: string | number }>) {
          const ordenItem = itemsMap.get(received.productoId);
          if (!ordenItem) {
            throw new Error(`Producto ${received.productoId} no encontrado en la orden`);
          }

          const cantRecibir = parseInt(String(received.cantidad), 10);
          if (isNaN(cantRecibir) || cantRecibir <= 0) continue;

          const pendiente = (ordenItem.cantidad as number) - (ordenItem.cantidadRecibida as number);
          if (cantRecibir > pendiente) {
            throw new Error(
              `Cantidad a recibir (${cantRecibir}) excede la pendiente (${pendiente}) para el producto ${received.productoId}`
            );
          }

          const producto = await tx.producto.findFirst({
            where: { id: received.productoId, tenantId: session.tenantId },
          });
          if (!producto) {
            throw new Error(`Producto ${received.productoId} no encontrado`);
          }

          const costoUnitNum = received.precioUnit
            ? parseFloat(String(received.precioUnit))
            : Number((ordenItem.precioUnit as number) || producto.costoUnit || 0);

          let inventory = await tx.inventario.findUnique({
            where: {
              bodegaId_productoId_lote: {
                bodegaId,
                productoId: received.productoId,
                lote: "",
              },
            },
          });

          const cantAnterior = inventory?.cantidad ?? 0;
          const nuevaCantidad = cantAnterior + cantRecibir;

          if (inventory) {
            await tx.inventario.update({
              where: { id: inventory.id },
              data: { cantidad: nuevaCantidad },
            });
          } else {
            await tx.inventario.create({
              data: {
                bodegaId,
                productoId: received.productoId,
                cantidad: cantRecibir,
                lote: "",
              },
            });
          }

          await (tx as any).$queryRawUnsafe(
            `UPDATE "OrdenCompraItem"
             SET "cantidadRecibida" = "cantidadRecibida" + $1
             WHERE "id" = $2`,
            cantRecibir,
            ordenItem.id
          );

          const movimiento = await tx.movimiento.create({
            data: {
              tipo: "ENTRADA",
              fecha: new Date(),
              cantidad: cantRecibir,
              cantAnterior,
              cantNueva: nuevaCantidad,
              costoUnit: costoUnitNum,
              total: cantRecibir * costoUnitNum,
              bodegaId,
              productoId: received.productoId,
              usuarioId: session.uid,
              notas: `Recepción orden de compra #${id.slice(0, 8)}`,
              referencia: id,
              tenantId: session.tenantId,
            },
            include: {
              producto: { select: { nombre: true, codigo: true } },
              bodega: { select: { nombre: true } },
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
          });

          const updatedItemRaw = await (prisma as any).$queryRawUnsafe(
            `SELECT * FROM "OrdenCompraItem" WHERE "id" = $1`,
            ordenItem.id
          ) as Array<{ cantidad: number; cantidadRecibida: number }>;

          if (updatedItemRaw[0].cantidad > updatedItemRaw[0].cantidadRecibida) {
            allComplete = false;
          }
        }

        const nuevoEstado = allComplete ? "COMPLETADA" : "PARCIAL";
        await (tx as any).$queryRawUnsafe(
          `UPDATE "OrdenCompra" SET "estado" = $1, "updatedAt" = $2 WHERE "id" = $3`,
          nuevoEstado,
          new Date(),
          id
        );

        return { movimientos: movimientosCreados, estado: nuevoEstado };
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        movimientos: result.movimientos,
        nuevoEstado: result.estado,
      },
      message: `Recepción procesada: ${result.movimientos.length} movimientos creados. Estado: ${result.estado}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("Ordenes compra recibir error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
