export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

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
    const { tipo, formato = "csv", filters = {} } = body;

    const tenantId = session.tenantId;
    const bodegaId = filters.bodegaId || "";
    const categoriaId = filters.categoriaId || "";
    const productoId = filters.productoId || "";
    const desde = filters.desde || "";
    const hasta = filters.hasta || "";

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = "exportacion";

    switch (tipo) {
      case "inventario": {
        filename = "inventario";
        headers = [
          "Codigo", "Producto", "Descripcion", "Categoria", "Proveedor",
          "Bodega", "Cantidad", "Unidad", "Costo Unit.", "Precio Unit.",
          "Valor Total", "Stock Min", "Stock Max", "Lote", "Ultima Actualizacion",
        ];

        const inventarioWhere: Record<string, unknown> = {};
        if (bodegaId) inventarioWhere.bodegaId = bodegaId;

        const inventario = await prisma.inventario.findMany({
          where: {
            ...inventarioWhere,
            bodega: { tenantId },
          },
          include: {
            producto: {
              select: {
                id: true, codigo: true, nombre: true, descripcion: true,
                unidadMedida: true, costoUnit: true, precioUnit: true,
                stockMin: true, stockMax: true, sku: true,
                categoria: { select: { nombre: true } },
                proveedor: { select: { nombre: true } },
              },
            },
            bodega: { select: { id: true, nombre: true } },
          },
          orderBy: { producto: { nombre: "asc" } },
        });

        rows = inventario.map((inv: any) => [
          inv.producto.codigo,
          inv.producto.nombre,
          inv.producto.descripcion || "",
          inv.producto.categoria?.nombre || "",
          inv.producto.proveedor?.nombre || "",
          inv.bodega.nombre,
          inv.cantidad.toString(),
          inv.producto.unidadMedida,
          Number(inv.producto.costoUnit || 0).toFixed(4),
          Number(inv.producto.precioUnit || 0).toFixed(2),
          (inv.cantidad * Number(inv.producto.costoUnit || 0)).toFixed(2),
          inv.producto.stockMin.toString(),
          inv.producto.stockMax.toString(),
          inv.lote || "",
          inv.ultimaActualizacion ? new Date(inv.ultimaActualizacion).toISOString() : "",
        ]);
        break;
      }

      case "movimientos": {
        filename = "movimientos";
        headers = [
          "Fecha", "Tipo", "Producto", "Codigo", "Cantidad", "Cant. Anterior",
          "Cant. Nueva", "Costo Unit.", "Total", "Bodega", "Bodega Destino",
          "Usuario", "Notas", "Documento", "Referencia",
        ];

        const movWhere: Record<string, unknown> = { tenantId };
        if (bodegaId) movWhere.bodegaId = bodegaId;
        if (productoId) movWhere.productoId = productoId;
        if (desde || hasta) {
          const fechaFilter: Record<string, Date> = {};
          if (desde) fechaFilter.gte = new Date(desde);
          if (hasta) {
            const hastaDate = new Date(hasta);
            hastaDate.setHours(23, 59, 59, 999);
            fechaFilter.lte = hastaDate;
          }
          movWhere.fecha = fechaFilter;
        }

        const movimientos = await prisma.movimiento.findMany({
          where: movWhere,
          include: {
            producto: { select: { codigo: true, nombre: true } },
            bodega: { select: { nombre: true } },
            bodegaDestino: { select: { nombre: true } },
            usuario: { select: { nombre: true } },
          },
          orderBy: { fecha: "desc" },
          take: 5000,
        });

        rows = movimientos.map((m: any) => [
          new Date(m.fecha).toISOString(),
          m.tipo,
          m.producto.nombre,
          m.producto.codigo,
          m.cantidad.toString(),
          m.cantAnterior.toString(),
          m.cantNueva.toString(),
          Number(m.costoUnit || 0).toFixed(4),
          Number(m.total || 0).toFixed(2),
          m.bodega.nombre,
          m.bodegaDestino?.nombre || "",
          m.usuario.nombre,
          m.notas || "",
          m.documento || "",
          m.referencia || "",
        ]);
        break;
      }

      case "productos": {
        filename = "productos";
        headers = [
          "Codigo", "Nombre", "Descripcion", "Categoria", "Proveedor",
          "Unidad", "Costo Unit.", "Precio Unit.", "Stock Min", "Stock Max",
          "SKU", "Codigo Barras", "Stock Total", "Bodegas", "Estado",
        ];

        const prodWhere: Record<string, unknown> = { tenantId };
        if (categoriaId) prodWhere.categoriaId = categoriaId;

        const productos = await prisma.producto.findMany({
          where: prodWhere,
          include: {
            categoria: { select: { nombre: true } },
            proveedor: { select: { nombre: true } },
            inventarios: {
              select: { cantidad: true, bodega: { select: { nombre: true } } },
            },
          },
          orderBy: { nombre: "asc" },
          take: 5000,
        });

        rows = productos.map((p: any) => [
          p.codigo,
          p.nombre,
          p.descripcion || "",
          p.categoria.nombre,
          p.proveedor?.nombre || "",
          p.unidadMedida,
          Number(p.costoUnit).toFixed(4),
          Number(p.precioUnit).toFixed(2),
          p.stockMin.toString(),
          p.stockMax.toString(),
          p.sku || "",
          p.codigoBarras || "",
          p.inventarios.reduce((s: number, i: { cantidad: number }) => s + i.cantidad, 0).toString(),
          p.inventarios
            .filter((i: { cantidad: number }) => i.cantidad > 0)
            .map((i: { cantidad: number; bodega: { nombre: string } }) => `${i.bodega.nombre}: ${i.cantidad}`)
            .join("; "),
          p.estado,
        ]);
        break;
      }

      case "stock_bajo": {
        filename = "stock_bajo";
        headers = [
          "Codigo", "Producto", "SKU", "Bodega", "Stock Actual", "Stock Min",
          "Stock Max", "Deficit", "Costo Unit.", "Precio Unit.", "Proveedor",
          "Ultima Actualizacion",
        ];

        const invWhere: Record<string, unknown> = {};
        if (bodegaId) invWhere.bodegaId = bodegaId;

        const inventario = await prisma.inventario.findMany({
          where: {
            ...invWhere,
            bodega: { tenantId },
          },
          include: {
            producto: {
              select: {
                id: true, codigo: true, nombre: true, sku: true, stockMin: true,
                stockMax: true, costoUnit: true, precioUnit: true, unidadMedida: true,
                proveedor: { select: { nombre: true } },
              },
            },
            bodega: { select: { nombre: true } },
          },
        });

        const bajo = inventario.filter(
          (inv: { producto: { stockMin: number }; cantidad: number }) =>
            inv.producto.stockMin > 0 && inv.cantidad > 0 && inv.cantidad <= inv.producto.stockMin
        );

        rows = bajo.map((inv: any) => [
          inv.producto.codigo,
          inv.producto.nombre,
          inv.producto.sku || "",
          inv.bodega.nombre,
          inv.cantidad.toString(),
          inv.producto.stockMin.toString(),
          inv.producto.stockMax.toString(),
          (inv.producto.stockMin - inv.cantidad).toString(),
          Number(inv.producto.costoUnit).toFixed(4),
          Number(inv.producto.precioUnit).toFixed(2),
          inv.producto.proveedor?.nombre || "",
          inv.ultimaActualizacion ? new Date(inv.ultimaActualizacion).toISOString() : "",
        ]);
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Tipo de exportacion no valido: ${tipo}` },
          { status: 400 }
        );
    }

    if (formato === "csv" || !formato) {
      const bom = "\uFEFF";
      const csvContent =
        bom +
        headers.map((h) => `"${h}"`).join(",") +
        "\n" +
        rows
          .map((row) =>
            row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

      const safeFilename = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
        },
      });
    }

    if (formato === "excel") {
      const tsvContent =
        headers.join("\t") +
        "\n" +
        rows.map((row) => row.join("\t")).join("\n");

      const safeFilename = `${filename}_${new Date().toISOString().slice(0, 10)}.xls`;

      return new NextResponse(tsvContent, {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: `Formato no soportado: ${formato}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
