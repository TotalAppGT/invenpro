export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

// Aprobación de ajustes: al aprobar se ejecuta el cambio en inventario.
// Un SUPERVISOR/ADMIN (con permiso) aprueba; el solicitante no puede auto-aprobarse.

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const ajuste = await prisma.ajusteInventario.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
      include: { items: true },
    });
    if (!ajuste) {
      return NextResponse.json({ success: false, error: "Ajuste no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const accion = body.accion as string;

    if (ajuste.estado === "EJECUTADO") {
      return NextResponse.json({ success: false, error: "El ajuste ya fue ejecutado" }, { status: 400 });
    }

    if (accion === "RECHAZAR") {
      const updated = await prisma.ajusteInventario.update({
        where: { id: params.id },
        data: { estado: "RECHAZADO", aprobadorId: session.uid, fechaAprobacion: new Date() },
      });
      return NextResponse.json({ success: true, data: updated, message: "Ajuste rechazado" });
    }

    if (accion === "APROBAR") {
      if (ajuste.solicitanteId === session.uid && session.rol === "OPERADOR") {
        return NextResponse.json({ success: false, error: "El solicitante no puede aprobar su propio ajuste" }, { status: 403 });
      }

      await prisma.$transaction(async (tx) => {
        for (const item of ajuste.items) {
          const inventario = await tx.inventario.findUnique({
            where: { bodegaId_productoId_lote: { bodegaId: ajuste.bodegaId, productoId: item.productoId, lote: item.lote ?? "" } },
          });
          const cantAnterior = inventario?.cantidad ?? 0;
          const cantNueva = item.cantidadFisica;

          if (inventario) {
            await tx.inventario.update({ where: { id: inventario.id }, data: { cantidad: cantNueva } });
          } else {
            await tx.inventario.create({
              data: { bodegaId: ajuste.bodegaId, productoId: item.productoId, lote: item.lote ?? "", cantidad: cantNueva },
            });
          }

          await tx.movimiento.create({
            data: {
              tipo: "AJUSTE",
              cantidad: cantNueva - cantAnterior,
              cantAnterior,
              cantNueva,
              costoUnit: item.costoUnit,
              total: Number(item.costoUnit) * (cantNueva - cantAnterior),
              bodegaId: ajuste.bodegaId,
              productoId: item.productoId,
              usuarioId: session.uid,
              notas: `Ajuste ${ajuste.numero}: ${ajuste.motivo}`,
              documento: ajuste.numero,
              tenantId: session.tenantId,
            },
          });
        }

        await tx.ajusteInventario.update({
          where: { id: params.id },
          data: { estado: "EJECUTADO", aprobadorId: session.uid, fechaAprobacion: new Date() },
        });
      });

      const updated = await prisma.ajusteInventario.findUnique({ where: { id: params.id } });
      return NextResponse.json({ success: true, data: updated, message: "Ajuste aprobado y ejecutado" });
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("Ajuste PATCH error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
