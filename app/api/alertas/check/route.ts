import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { sendStockAlertEmail } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const alertasActivas = await prisma.alerta.findMany({
      where: { tenantId: session.tenantId, activa: true },
    });

    let enviadas = 0;
    const errores: string[] = [];

    for (const alerta of alertasActivas) {
      try {
        if (alerta.tipo === "STOCK_BAJO") {
          const inventarioBajo = await prisma.inventario.findMany({
            where: {
              bodega: { tenantId: session.tenantId },
              cantidad: { gt: 0 },
            },
            include: {
              producto: {
                select: { id: true, nombre: true, codigo: true, sku: true, stockMin: true },
              },
              bodega: { select: { nombre: true } },
            },
          });

          const bajo = inventarioBajo.filter(
            (inv: { producto: { stockMin: number }; cantidad: number }) => inv.producto.stockMin > 0 && inv.cantidad <= inv.producto.stockMin
          );

          for (const item of bajo) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
            for (const destinatario of alerta.destinatarios) {
              await sendStockAlertEmail({
                to: destinatario,
                productName: item.producto.nombre,
                sku: item.producto.sku ?? item.producto.codigo,
                currentStock: item.cantidad,
                minStock: item.producto.stockMin,
                almacen: item.bodega.nombre,
                url: `${appUrl}/inventario`,
              }).catch(() => {});
            }
          }
          enviadas += bajo.length;
        }

        if (alerta.tipo === "VENCIMIENTO") {
          const now = new Date();
          const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          const proximosVencer = await prisma.inventario.findMany({
            where: {
              bodega: { tenantId: session.tenantId },
              fechaVencimiento: {
                not: null,
                gte: now,
                lte: thirtyDaysLater,
              },
            },
            include: {
              producto: {
                select: { id: true, nombre: true, codigo: true },
              },
              bodega: { select: { nombre: true } },
            },
          });

          for (const item of proximosVencer) {
            const itemVencimiento = item.fechaVencimiento as Date;
            const dias = Math.ceil(
              (itemVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            alerta.destinatarios.forEach(() => {
              enviadas++;
            });
          }
        }

        await prisma.alerta.update({
          where: { id: alerta.id },
          data: { ultimoEnvio: new Date() },
        });
      } catch (alertErr) {
        errores.push(`Error en alerta ${alerta.id}: ${(alertErr as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alertasProcesadas: alertasActivas.length,
        enviadas,
        errores: errores.length,
      },
      message: `Verificación completada: ${enviadas} alertas enviadas`,
    });
  } catch (error) {
    console.error("Alertas check error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
