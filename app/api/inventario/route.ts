import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

type InvItem = {
  id: string;
  bodegaId: string;
  productoId: string;
  cantidad: number;
  lote: string;
  fechaVencimiento: Date | null;
  ultimaActualizacion: Date;
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    unidadMedida: string;
    costoUnit: any;
    precioUnit: any;
    stockMin: number;
    stockMax: number;
    codigoBarras: string | null;
    sku: string | null;
    imagen: string | null;
    estado: string;
    categoria: { id: string; nombre: string };
    proveedor: { id: string; nombre: string } | null;
  };
  bodega: { id: string; nombre: string };
};

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
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const search = searchParams.get("search") ?? "";
    const stockStatus = searchParams.get("stockStatus") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = {
      bodega: { tenantId: session.tenantId },
    };

    if (bodegaId) {
      where.bodegaId = bodegaId;
    }

    if (search.trim()) {
      where.producto = {
        OR: [
          { nombre: { contains: search.trim(), mode: "insensitive" } },
          { codigo: { contains: search.trim(), mode: "insensitive" } },
          { sku: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    }

    const allInventory = await prisma.inventario.findMany({
      where,
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
            codigoBarras: true,
            sku: true,
            imagen: true,
            estado: true,
            categoria: { select: { id: true, nombre: true } },
            proveedor: { select: { id: true, nombre: true } },
          },
        },
        bodega: { select: { id: true, nombre: true } },
      },
      orderBy: { producto: { nombre: "asc" } },
    });

    let filtered = allInventory;

    if (stockStatus === "bajo") {
      filtered = allInventory.filter(
        (inv: InvItem) =>
          inv.producto.stockMin > 0 &&
          inv.cantidad > 0 &&
          inv.cantidad <= inv.producto.stockMin
      );
    } else if (stockStatus === "normal") {
      filtered = allInventory.filter(
        (inv: InvItem) =>
          inv.cantidad > (inv.producto.stockMin > 0 ? inv.producto.stockMin : 0)
      );
    } else if (stockStatus === "sin") {
      filtered = allInventory.filter((inv: InvItem) => inv.cantidad === 0);
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const totalValue = allInventory.reduce(
      (sum: number, inv: InvItem) => sum + inv.cantidad * Number(inv.producto.costoUnit ?? 0),
      0
    );

    const data = paginated.map((inv: InvItem) => ({
      id: inv.id,
      bodegaId: inv.bodegaId,
      bodega: inv.bodega,
      productoId: inv.productoId,
      producto: {
        ...inv.producto,
        costoUnit: Number(inv.producto.costoUnit),
        precioUnit: Number(inv.producto.precioUnit),
      },
      cantidad: inv.cantidad,
      lote: inv.lote,
      fechaVencimiento: inv.fechaVencimiento,
      ultimaActualizacion: inv.ultimaActualizacion,
      valorTotal: inv.cantidad * Number(inv.producto.costoUnit ?? 0),
      stockStatus: inv.cantidad === 0
        ? "sin"
        : inv.producto.stockMin > 0 && inv.cantidad <= inv.producto.stockMin
        ? "bajo"
        : "normal",
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
        totalValue,
      },
    });
  } catch (error) {
    console.error("Inventario GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
