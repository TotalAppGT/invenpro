export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

// Análisis ABC (Pareto por valor de consumo), rotación y producto obsoleto.

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dias = Math.min(730, Math.max(30, parseInt(searchParams.get("dias") ?? "365", 10)));
    const umbralObsoleto = Math.max(30, parseInt(searchParams.get("obsoleto") ?? "90", 10));

    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const productos = await prisma.producto.findMany({
      where: { tenantId: session.tenantId },
      include: {
        inventarios: { select: { cantidad: true } },
        categoria: { select: { nombre: true } },
      },
    });

    const consumo = await prisma.movimiento.groupBy({
      by: ["productoId"],
      where: { tenantId: session.tenantId, tipo: "SALIDA", fecha: { gte: desde } },
      _sum: { cantidad: true, total: true },
    });
    const consumoMap = new Map(consumo.map((c) => [c.productoId, c]));

    const ultimoMov = await prisma.movimiento.groupBy({
      by: ["productoId"],
      where: { tenantId: session.tenantId },
      _max: { fecha: true },
    });
    const ultimoMap = new Map(ultimoMov.map((m) => [m.productoId, m._max.fecha]));

    const totalValorConsumo = productos.reduce((sum, p) => {
      const c = consumoMap.get(p.id);
      return sum + Number(c?._sum.total ?? 0);
    }, 0);

    const now = Date.now();

    const items = productos.map((p) => {
      const c = consumoMap.get(p.id);
      const cantidadConsumida = c?._sum.cantidad ?? 0;
      const valorConsumo = Number(c?._sum.total ?? 0) || cantidadConsumida * Number(p.costoUnit);
      const stockTotal = p.inventarios.reduce((s, i) => s + i.cantidad, 0);
      const ultima = ultimoMap.get(p.id) ?? null;
      const diasSinMovimiento = ultima ? Math.floor((now - new Date(ultima).getTime()) / 86400000) : 9999;
      const valorInventario = stockTotal * Number(p.costoUnit);

      return {
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria.nombre,
        stockTotal,
        valorInventario,
        cantidadConsumida,
        valorConsumo,
        diasSinMovimiento,
        ultimaSalida: ultima,
        clasificacionActual: p.clasificacion,
      };
    });

    const ordenado = [...items].sort((a, b) => b.valorConsumo - a.valorConsumo);
    let acumulado = 0;
    const conABC = ordenado.map((item) => {
      const participacion = totalValorConsumo > 0 ? item.valorConsumo / totalValorConsumo : 0;
      acumulado += participacion;
      let clase: "A" | "B" | "C" = "C";
      if (acumulado <= 0.8) clase = "A";
      else if (acumulado <= 0.95) clase = "B";
      return { ...item, participacion: Number((participacion * 100).toFixed(2)), participacionAcumulada: Number((acumulado * 100).toFixed(2)), claseSugerida: clase };
    });

    const resumen = { A: 0, B: 0, C: 0 };
    for (const it of conABC) resumen[it.claseSugerida]++;

    const obsoletos = conABC
      .filter((i) => i.diasSinMovimiento >= umbralObsoleto && i.stockTotal > 0)
      .sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento);

    const estancados = conABC
      .filter((i) => i.stockTotal > 0 && i.cantidadConsumida === 0)
      .sort((a, b) => b.valorInventario - a.valorInventario);

    const altaRotacion = conABC
      .filter((i) => i.cantidadConsumida > 0)
      .sort((a, b) => b.cantidadConsumida - a.cantidadConsumida)
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        abc: conABC,
        resumenABC: resumen,
        obsoletos,
        estancados,
        altaRotacion,
        totalValorConsumo,
        dias,
        umbralObsoleto,
      },
    });
  } catch (error) {
    console.error("Reporte inventario-pro GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
