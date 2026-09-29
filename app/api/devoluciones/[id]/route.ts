export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

// Acciones: aprobar (mueve stock), rechazar, completar.

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const devolucion = await prisma.devolucion.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true },
    });
    if (!devolucion) {
      return NextResponse.json({ success: false, error: "Devolución no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const accion = body.accion as string;

    if (accion === "RECHAZAR") {
      if (devolucion.estado === "COMPLETADA") {
        return NextResponse.json({ success: false, error: "Una devolución completada no puede rechazarse" }, { status: 400 });
      }
      const updated = await prisma.devolucion.update({
        where: { id: params.id },
        data: { estado: "RECHAZADA", aprobadorId: session.uid },
      });
      return NextResponse.json({ success: true, data: updated, message: "Devolución rechazada" });
    }

    if (accion === "APROBAR" || accion === "COMPLETAR") {
      if (devolucion.estado === "COMPLETADA") {
        return NextResponse.json({ success: false, error: "La devolución ya está completada" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // PROVEEDOR: sale mercancía hacia el proveedor. CLIENTE: reingresa si reingresa=true.
        const esSalida = devolucion.tipo === "PROVEEDOR";

        for (const item of devolucion.items) {
          const debeMover = esSalida || item.reingresa;
          if (!debeMover) continue;

          const inventario = await tx.inventario.findUnique({
            where: { bodegaId_productoId_lote: { bodegaId: devolucion.bodegaId, productoId: item.productoId, lote: item.lote ?? "" } },
          });
          const cantAnterior = inventario?.cantidad ?? 0;

          if (esSalida) {
            const cantNueva = Math.max(0, cantAnterior - item.cantidad);
            if (inventario) {
              await tx.inventario.update({ where: { id: inventario.id }, data: { cantidad: cantNueva } });
            }
            await tx.movimiento.create({
              data: {
                tipo: "SALIDA",
                cantidad: item.cantidad,
                cantAnterior,
                cantNueva,
                costoUnit: item.costoUnit,
                total: Number(item.costoUnit) * item.cantidad,
                bodegaId: devolucion.bodegaId,
                productoId: item.productoId,
                usuarioId: session.uid,
                notas: `Devolución ${devolucion.numero} a proveedor`,
                documento: devolucion.numero,
                tenantId: session.tenantId,
              },
            });
          } else {
            const cantNueva = cantAnterior + item.cantidad;
            if (inventario) {
              await tx.inventario.update({ where: { id: inventario.id }, data: { cantidad: cantNueva } });
            } else {
              await tx.inventario.create({
                data: { bodegaId: devolucion.bodegaId, productoId: item.productoId, lote: item.lote ?? "", cantidad: item.cantidad },
              });
            }
            await tx.movimiento.create({
              data: {
                tipo: "ENTRADA",
                cantidad: item.cantidad,
                cantAnterior,
                cantNueva,
                costoUnit: item.costoUnit,
                total: Number(item.costoUnit) * item.cantidad,
                bodegaId: devolucion.bodegaId,
                productoId: item.productoId,
                usuarioId: session.uid,
                notas: `Devolución ${devolucion.numero} de cliente`,
                documento: devolucion.numero,
                tenantId: session.tenantId,
              },
            });
          }
        }

        await tx.devolucion.update({
          where: { id: params.id },
          data: {
            estado: accion === "APROBAR" ? "APROBADA" : "COMPLETADA",
            aprobadorId: session.uid,
          },
        });
      });

      const updated = await prisma.devolucion.findUnique({ where: { id: params.id } });
      return NextResponse.json({ success: true, data: updated, message: accion === "APROBAR" ? "Devolución aprobada y stock actualizado" : "Devolución completada" });
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Devolucion PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
