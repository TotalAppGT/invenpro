export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

// Sugerencias de compra basadas en punto de reorden, stock de seguridad,
// lead time y consumo promedio (últimos 90 días).

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bodegaId = searchParams.get("bodegaId") ?? "";

    const productos = await prisma.producto.findMany({
      where: { tenantId: session.tenantId, estado: "ACTIVO" },
      include: {
        proveedor: { select: { id: true, nombre: true } },
        inventarios: { select: { cantidad: true, bodegaId: true } },
      },
    });

    const desde = new Date();
    desde.setDate(desde.getDate() - 90);

    const salidas = await prisma.movimiento.groupBy({
      by: ["productoId"],
      where: {
        tenantId: session.tenantId,
        tipo: { in: ["SALIDA", "CONTEO_DIFERENCIA"] },
        fecha: { gte: desde },
      },
      _sum: { cantidad: true },
    });
    const consumoMap = new Map<string, number>();
    for (const s of salidas) consumoMap.set(s.productoId, s._sum.cantidad ?? 0);

    const sugerencias = productos
      .map((p) => {
        const stockTotal = p.inventarios
          .filter((i) => (bodegaId ? i.bodegaId === bodegaId : true))
          .reduce((sum, i) => sum + i.cantidad, 0);

        const consumo90 = consumoMap.get(p.id) ?? 0;
        const consumoDiario = consumo90 / 90;
        const leadTime = p.leadTimeDias || 7;

        const puntoReorden = p.puntoReorden > 0
          ? p.puntoReorden
          : Math.ceil(consumoDiario * leadTime + (p.stockSeguridad || 0));

        const demandaLeadTime = Math.ceil(consumoDiario * leadTime);
        const objetivo = puntoReorden + p.stockSeguridad + demandaLeadTime;
        const cantidadSugerida = Math.max(0, objetivo - stockTotal);

        const requiereCompra = stockTotal <= puntoReorden && puntoReorden > 0;
        const diasCobertura = consumoDiario > 0 ? Math.floor(stockTotal / consumoDiario) : null;

        return {
          producto: {
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            unidadMedida: p.unidadMedida,
            costoUnit: Number(p.costoUnit),
          },
          proveedor: p.proveedor,
          stockTotal,
          stockMin: p.stockMin,
          stockSeguridad: p.stockSeguridad,
          leadTimeDias: leadTime,
          puntoReorden,
          consumoDiario: Number(consumoDiario.toFixed(2)),
          demandaLeadTime,
          cantidadSugerida,
          diasCobertura,
          requiereCompra,
          clasificacion: p.clasificacion,
          costoEstimado: Number((cantidadSugerida * Number(p.costoUnit)).toFixed(2)),
        };
      })
      .filter((s) => s.puntoReorden > 0 || s.stockMin > 0)
      .sort((a, b) => b.cantidadSugerida - a.cantidadSugerida);

    const urgentes = sugerencias.filter((s) => s.requiereCompra);
    const totalEstimado = urgentes.reduce((sum, s) => sum + s.costoEstimado, 0);

    return NextResponse.json({
      success: true,
      data: sugerencias,
      meta: { total: sugerencias.length, urgentes: urgentes.length, totalEstimado },
    });
  } catch (error) {
    console.error("Compras sugeridas GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
