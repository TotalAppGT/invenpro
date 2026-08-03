export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import {
  calculateKardex,
  calculateTotalKardexSummary,
  type ValuationMovement,
  type KardexEntry,
} from "@/lib/inventory-valuation";

interface KardexApiResponse {
  entries: KardexEntry[];
  summary: {
    stockActual: number;
    valorTotal: number;
    costoPromedio: number;
    totalEntradas: number;
    totalSalidas: number;
    totalEntradasValor: number;
    totalSalidasValor: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productoId = searchParams.get("productoId");
    const bodegaId = searchParams.get("bodegaId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const metodo = searchParams.get("metodo") || "PROMEDIO";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!productoId) {
      return NextResponse.json(
        { success: false, error: "El parámetro productoId es obligatorio" },
        { status: 400 }
      );
    }

    const validMethods = ["PEPS", "UEPS", "PROMEDIO"];
    const valuationMethod = validMethods.includes(metodo)
      ? (metodo as "PEPS" | "UEPS" | "PROMEDIO")
      : "PROMEDIO";

    if (!bodegaId) {
      return NextResponse.json(
        { success: false, error: "El parámetro bodegaId es obligatorio" },
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

    const producto = await prisma.producto.findFirst({
      where: { id: productoId, tenantId: session.tenantId },
    });

    if (!producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const whereClause: Record<string, unknown> = {
      tenantId: session.tenantId,
      productoId,
      bodegaId,
    };

    if (desde || hasta) {
      const fechaFilter: Record<string, Date> = {};
      if (desde) {
        fechaFilter.gte = new Date(desde);
      }
      if (hasta) {
        const hastaDate = new Date(hasta);
        hastaDate.setHours(23, 59, 59, 999);
        fechaFilter.lte = hastaDate;
      }
      whereClause.fecha = fechaFilter;
    }

    const [totalCount, movimientos] = await Promise.all([
      prisma.movimiento.count({ where: whereClause as any }),
      prisma.movimiento.findMany({
        where: whereClause as any,
        orderBy: { fecha: "asc" },
        include: {
          producto: { select: { id: true, nombre: true, codigo: true } },
          bodega: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const valuationMovements: ValuationMovement[] = movimientos.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      cantidad: m.cantidad,
      costoUnit: Number(m.costoUnit ?? producto.costoUnit ?? 0),
      total: Number(m.total ?? 0),
      documento: m.documento,
      detalle: m.notas,
    }));

    const allMovements = await prisma.movimiento.findMany({
      where: whereClause as any,
      orderBy: { fecha: "asc" },
    });

    const allValuationMovements: ValuationMovement[] = allMovements.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      cantidad: m.cantidad,
      costoUnit: Number(m.costoUnit ?? producto.costoUnit ?? 0),
      total: Number(m.total ?? 0),
      documento: m.documento,
      detalle: m.notas,
    }));

    const kardexEntries = calculateKardex(allValuationMovements, valuationMethod);
    const summary = calculateTotalKardexSummary(kardexEntries);

    const response: KardexApiResponse = {
      entries: kardexEntries,
      summary,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
      meta: {
        producto: { id: producto.id, nombre: producto.nombre, codigo: producto.codigo },
        bodega: { id: bodega.id, nombre: bodega.nombre },
        metodo: valuationMethod,
      },
    });
  } catch (error) {
    console.error("Error fetching kardex:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
