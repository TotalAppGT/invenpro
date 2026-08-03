export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { DashboardStats } from "@/types";

type InvWithProduct = {
  cantidad: number;
  producto: {
    id: string;
    nombre: string;
    codigo: string;
    costoUnit: any;
    precioUnit: any;
    stockMin: number;
    stockMax: number;
    codigoBarras: string | null;
    sku: string | null;
    imagen: string | null;
  };
  bodega: { id: string; nombre: string };
};

type GroupByResult = { bodegaId: string; _sum: { cantidad: number | null } };

type MovGroupByResult = { tipo: string; _count: { id: number } };

type RecentMov = {
  id: string;
  tipo: string;
  fecha: Date;
  cantidad: number;
  producto: { nombre: string; codigo: string };
  bodega: { nombre: string };
  bodegaDestino: { nombre: string } | null;
  usuario: { nombre: string };
  notas: string | null;
};

type BodegaInfo = { id: string; nombre: string };

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalBodegas,
      totalProductos,
      inventarioItems,
      sinStockItems,
      movimientosHoy,
      totalProveedores,
      movimientosUltimos7Dias,
      inventarioConProducto,
      recentMovements,
      valorPorBodegaRaw,
    ] = await Promise.all([
      prisma.bodega.count({ where: { tenantId, activa: true } }),
      prisma.producto.count({ where: { tenantId, estado: "ACTIVO" } }),
      prisma.inventario.count({
        where: { bodega: { tenantId } },
      }),
      prisma.inventario.count({
        where: { bodega: { tenantId }, cantidad: 0 },
      }),
      prisma.movimiento.count({
        where: { tenantId, fecha: { gte: todayStart } },
      }),
      prisma.proveedor.count({ where: { tenantId } }),
      prisma.movimiento.groupBy({
        by: ["tipo"],
        where: { tenantId, fecha: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),
      prisma.inventario.findMany({
        where: { bodega: { tenantId } },
        include: {
          producto: {
            select: { id: true, nombre: true, codigo: true, costoUnit: true, precioUnit: true, stockMin: true, stockMax: true, codigoBarras: true, sku: true, imagen: true },
          },
          bodega: { select: { id: true, nombre: true } },
        },
      }),
      prisma.movimiento.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: {
          producto: { select: { nombre: true, codigo: true } },
          bodega: { select: { nombre: true } },
          bodegaDestino: { select: { nombre: true } },
          usuario: { select: { nombre: true } },
        },
      }),
      prisma.inventario.groupBy({
        by: ["bodegaId"],
        where: { bodega: { tenantId } },
        _sum: { cantidad: true },
      }),
    ]);

    const bodegasConNombre = await prisma.bodega.findMany({
      where: { id: { in: valorPorBodegaRaw.map((v: GroupByResult) => v.bodegaId) } },
      select: { id: true, nombre: true },
    });
    const bodegaNombreMap = new Map(bodegasConNombre.map((b: BodegaInfo) => [b.id, b.nombre]));

    const totalValor = inventarioConProducto.reduce((sum: number, inv: InvWithProduct) => {
      return sum + inv.cantidad * Number(inv.producto.costoUnit ?? 0);
    }, 0);

    const stockBajoCount = inventarioConProducto.filter(
      (inv: InvWithProduct) => inv.producto.stockMin > 0 && inv.cantidad > 0 && inv.cantidad <= inv.producto.stockMin
    ).length;

    const stats: DashboardStats = {
      totalProductos,
      totalBodegas,
      totalProveedores,
      totalUsuarios: 0,
      stockBajo: stockBajoCount,
      totalInventarioValor: totalValor,
      movimientosHoy,
      productosVencidos: 0,
      conteosActivos: 0,
      entradasMes: 0,
      salidasMes: 0,
    };

    const kanbanData = inventarioConProducto
      .map((inv: InvWithProduct) => ({
        productoId: inv.producto.id,
        codigo: inv.producto.codigo,
        nombre: inv.producto.nombre,
        sku: inv.producto.sku,
        codigoBarras: inv.producto.codigoBarras,
        imagen: inv.producto.imagen,
        bodega: inv.bodega.nombre,
        cantidad: inv.cantidad,
        stockMin: inv.producto.stockMin,
        stockMax: inv.producto.stockMax,
        costoUnit: Number(inv.producto.costoUnit),
        precioUnit: Number(inv.producto.precioUnit),
        valorTotal: inv.cantidad * Number(inv.producto.costoUnit),
        status:
          inv.cantidad === 0
            ? "sin"
            : inv.producto.stockMin > 0 && inv.cantidad <= inv.producto.stockMin
            ? "bajo"
            : "normal",
      }))
      .slice(0, 20);

    const conStock = kanbanData.filter((i: { status: string }) => i.status === "normal");
    const bajo = kanbanData.filter((i: { status: string }) => i.status === "bajo");
    const sin = kanbanData.filter((i: { status: string }) => i.status === "sin");

    const valorPorBodega = valorPorBodegaRaw.map((v: GroupByResult) => ({
      bodegaId: v.bodegaId,
      nombre: bodegaNombreMap.get(v.bodegaId) ?? "Desconocida",
      cantidadTotal: v._sum.cantidad ?? 0,
    }));

    const movimientosPorTipo = movimientosUltimos7Dias.map((m: MovGroupByResult) => ({
      tipo: m.tipo,
      count: m._count.id,
    }));

    const topProductos = inventarioConProducto
      .sort((a: InvWithProduct, b: InvWithProduct) => b.cantidad - a.cantidad)
      .slice(0, 10)
      .map((inv: InvWithProduct) => ({
        productoId: inv.producto.id,
        nombre: inv.producto.nombre,
        codigo: inv.producto.codigo,
        cantidad: inv.cantidad,
        bodega: inv.bodega.nombre,
      }));

    const recentMovementsData = recentMovements.map((m: RecentMov) => ({
      id: m.id,
      tipo: m.tipo,
      fecha: m.fecha,
      cantidad: m.cantidad,
      producto: m.producto.nombre,
      codigo: m.producto.codigo,
      bodega: m.bodega.nombre,
      bodegaDestino: m.bodegaDestino?.nombre ?? null,
      usuario: m.usuario.nombre,
      notas: m.notas,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats,
        kanban: { conStock, bajo, sin },
        charts: {
          valorPorBodega,
          movimientosPorTipo,
          topProductos,
        },
        recentMovements: recentMovementsData,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
