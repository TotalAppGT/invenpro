import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

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
    const tipo = searchParams.get("tipo") ?? "inventario";
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const categoriaId = searchParams.get("categoriaId") ?? "";
    const productoId = searchParams.get("productoId") ?? "";
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";

    const tenantId = session.tenantId;

    switch (tipo) {
      case "inventario": {
        const where: Record<string, unknown> = {};
        if (bodegaId) where.bodegaId = bodegaId;

        const inventario = await prisma.inventario.findMany({
          where: {
            ...where,
            bodega: { tenantId },
          },
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                descripcion: true,
                unidadMedida: true,
                costoUnit: true,
                precioUnit: true,
                stockMin: true,
                stockMax: true,
                sku: true,
                categoria: { select: { nombre: true } },
                proveedor: { select: { nombre: true } },
              },
            },
            bodega: { select: { id: true, nombre: true } },
          },
          orderBy: { producto: { nombre: "asc" } },
        });

        const data = inventario.map((inv: any) => ({
          codigo: inv.producto.codigo,
          producto: inv.producto.nombre,
          descripcion: inv.producto.descripcion,
          categoria: inv.producto.categoria.nombre,
          proveedor: inv.producto.proveedor?.nombre ?? "",
          bodega: inv.bodega.nombre,
          cantidad: inv.cantidad,
          unidadMedida: inv.producto.unidadMedida,
          costoUnit: Number(inv.producto.costoUnit),
          precioUnit: Number(inv.producto.precioUnit),
          valorTotal: inv.cantidad * Number(inv.producto.costoUnit ?? 0),
          stockMin: inv.producto.stockMin,
          stockMax: inv.producto.stockMax,
          lote: inv.lote,
          fechaVencimiento: inv.fechaVencimiento,
          ultimaActualizacion: inv.ultimaActualizacion,
        }));

        return NextResponse.json({ success: true, data });
      }

      case "movimientos": {
        const where: Record<string, unknown> = { tenantId };
        if (bodegaId) where.bodegaId = bodegaId;
        if (productoId) where.productoId = productoId;
        if (desde || hasta) {
          const fechaFilter: Record<string, Date> = {};
          if (desde) fechaFilter.gte = new Date(desde);
          if (hasta) {
            const hastaDate = new Date(hasta);
            hastaDate.setHours(23, 59, 59, 999);
            fechaFilter.lte = hastaDate;
          }
          where.fecha = fechaFilter;
        }

        const movimientos = await prisma.movimiento.findMany({
          where,
          include: {
            producto: { select: { codigo: true, nombre: true } },
            bodega: { select: { nombre: true } },
            bodegaDestino: { select: { nombre: true } },
            usuario: { select: { nombre: true } },
          },
          orderBy: { fecha: "desc" },
        });

        const data = movimientos.map((m: any) => ({
          fecha: m.fecha,
          tipo: m.tipo,
          producto: m.producto.nombre,
          codigo: m.producto.codigo,
          cantidad: m.cantidad,
          cantAnterior: m.cantAnterior,
          cantNueva: m.cantNueva,
          costoUnit: Number(m.costoUnit ?? 0),
          total: Number(m.total ?? 0),
          bodega: m.bodega.nombre,
          bodegaDestino: m.bodegaDestino?.nombre ?? "",
          usuario: m.usuario.nombre,
          notas: m.notas,
          documento: m.documento,
          referencia: m.referencia,
        }));

        return NextResponse.json({ success: true, data });
      }

      case "productos": {
        const where: Record<string, unknown> = {
          tenantId,
          estado: "ACTIVO",
        };
        if (categoriaId) where.categoriaId = categoriaId;

        const productos = await prisma.producto.findMany({
          where,
          include: {
            categoria: { select: { nombre: true } },
            proveedor: { select: { nombre: true } },
            inventarios: {
              select: { cantidad: true, bodega: { select: { nombre: true } } },
            },
          },
          orderBy: { nombre: "asc" },
        });

        const data = productos.map((p: any) => ({
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion,
          categoria: p.categoria.nombre,
          proveedor: p.proveedor?.nombre ?? "",
          unidadMedida: p.unidadMedida,
          costoUnit: Number(p.costoUnit),
          precioUnit: Number(p.precioUnit),
          stockMin: p.stockMin,
          stockMax: p.stockMax,
          sku: p.sku,
          codigoBarras: p.codigoBarras,
          stockTotal: p.inventarios.reduce((sum: number, i: { cantidad: number }) => sum + i.cantidad, 0),
          bodegas: p.inventarios
            .filter((i: { cantidad: number }) => i.cantidad > 0)
            .map((i: { cantidad: number; bodega: { nombre: string } }) => `${i.bodega.nombre}: ${i.cantidad}`)
            .join("; "),
        }));

        return NextResponse.json({ success: true, data });
      }

      case "stock_bajo": {
        const inventario = await prisma.inventario.findMany({
          where: {
            bodega: { tenantId },
            ...(bodegaId ? { bodegaId } : {}),
          },
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                sku: true,
                stockMin: true,
                stockMax: true,
                costoUnit: true,
                precioUnit: true,
                unidadMedida: true,
                proveedor: { select: { nombre: true } },
              },
            },
            bodega: { select: { nombre: true } },
          },
        });

        const bajo = inventario.filter(
          (inv: { producto: { stockMin: number }; cantidad: number }) =>
            inv.producto.stockMin > 0 &&
            inv.cantidad > 0 &&
            inv.cantidad <= inv.producto.stockMin
        );

        const data = bajo.map((inv: any) => ({
          codigo: inv.producto.codigo,
          producto: inv.producto.nombre,
          sku: inv.producto.sku,
          bodega: inv.bodega.nombre,
          stockActual: inv.cantidad,
          stockMin: inv.producto.stockMin,
          stockMax: inv.producto.stockMax,
          deficit: inv.producto.stockMin - inv.cantidad,
          costoUnit: Number(inv.producto.costoUnit),
          precioUnit: Number(inv.producto.precioUnit),
          proveedor: inv.producto.proveedor?.nombre ?? "",
          ultimaActualizacion: inv.ultimaActualizacion,
        }));

        return NextResponse.json({ success: true, data });
      }

      case "kardex": {
        if (!productoId) {
          return NextResponse.json(
            { success: false, error: "productoId es obligatorio para el reporte kardex" },
            { status: 400 }
          );
        }

        const producto = await prisma.producto.findFirst({
          where: { id: productoId, tenantId },
        });

        if (!producto) {
          return NextResponse.json(
            { success: false, error: "Producto no encontrado" },
            { status: 404 }
          );
        }

        const movWhere: Record<string, unknown> = {
          tenantId,
          productoId,
        };
        if (bodegaId) movWhere.bodegaId = bodegaId;

        const movimientos = await prisma.movimiento.findMany({
          where: movWhere,
          include: {
            producto: { select: { codigo: true, nombre: true } },
            bodega: { select: { nombre: true } },
          },
          orderBy: { fecha: "asc" },
        });

        let saldo = 0;
        const data = movimientos.map((m: any) => {
          if (m.tipo === "ENTRADA" || m.tipo === "AJUSTE" || m.tipo === "CONTEO_DIFERENCIA") {
            if (m.tipo === "CONTEO_DIFERENCIA") {
              saldo = m.cantNueva;
            } else {
              saldo += m.cantidad;
            }
          } else if (m.tipo === "SALIDA" || m.tipo === "TRASLADO") {
            saldo -= m.cantidad;
          }

          return {
            fecha: m.fecha,
            tipo: m.tipo,
            documento: m.documento,
            detalle: m.notas,
            entrada: m.tipo === "ENTRADA" || m.tipo === "AJUSTE" ? m.cantidad : 0,
            salida: m.tipo === "SALIDA" ? m.cantidad : m.tipo === "TRASLADO" ? m.cantidad : 0,
            saldo,
            costoUnit: Number(m.costoUnit ?? 0),
            costoTotal: m.cantidad * Number(m.costoUnit ?? 0),
            bodega: m.bodega.nombre,
          };
        });

        return NextResponse.json({ success: true, data });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Tipo de reporte no válido: ${tipo}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Reportes error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
