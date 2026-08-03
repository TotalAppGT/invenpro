export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits } from "@/lib/auth";
import { productoSchema } from "@/lib/validations";
import { generateId } from "@/lib/utils";
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
    const search = searchParams.get("search") ?? "";
    const categoria = searchParams.get("categoria") ?? "";
    const estado = searchParams.get("estado") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: "insensitive" } },
        { codigo: { contains: search.trim(), mode: "insensitive" } },
        { sku: { contains: search.trim(), mode: "insensitive" } },
        { codigoBarras: { contains: search.trim(), mode: "insensitive" } },
      ];
    }
    if (categoria) {
      where.categoriaId = categoria;
    }
    if (estado === "ACTIVO" || estado === "INACTIVO" || estado === "DESCONTINUADO") {
      where.estado = estado;
    }

    const [total, productos] = await Promise.all([
      prisma.producto.count({ where }),
      prisma.producto.findMany({
        where,
        include: {
          categoria: { select: { id: true, nombre: true } },
          proveedor: { select: { id: true, nombre: true } },
          inventarios: {
            select: { cantidad: true, bodega: { select: { nombre: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: productos.map((p: any) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        descripcion: p.descripcion,
        categoria: p.categoria,
        proveedor: p.proveedor,
        unidadMedida: p.unidadMedida,
        costoUnit: Number(p.costoUnit),
        precioUnit: Number(p.precioUnit),
        stockMin: p.stockMin,
        stockMax: p.stockMax,
        codigoBarras: p.codigoBarras,
        sku: p.sku,
        imagen: p.imagen,
        estado: p.estado,
        stockTotal: p.inventarios.reduce((sum: number, i: { cantidad: number }) => sum + i.cantidad, 0),
        inventarios: p.inventarios,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Productos GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const limits = getPlanLimits(session.tenantPlan);
    if (limits.maxProductos !== Infinity) {
      const currentCount = await prisma.producto.count({
        where: { tenantId: session.tenantId },
      });
      if (currentCount >= limits.maxProductos) {
        return NextResponse.json(
          {
            success: false,
            error: `Has alcanzado el límite de ${limits.maxProductos} productos para tu plan ${session.tenantPlan}`,
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();

    if (!body.codigo) {
      const lastProduct = await prisma.producto.findFirst({
        where: { tenantId: session.tenantId },
        orderBy: { createdAt: "desc" },
        select: { codigo: true },
      });

      let nextNumber = 1;
      if (lastProduct?.codigo) {
        const match = lastProduct.codigo.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      body.codigo = `PRD-${String(nextNumber).padStart(6, "0")}`;
    }

    const validation = productoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.findFirst({
      where: { id: validation.data.categoriaId, tenantId: session.tenantId },
    });
    if (!categoria && validation.data.categoriaId) {
      return NextResponse.json(
        { success: false, error: "Categoría no encontrada" },
        { status: 400 }
      );
    }

    if (validation.data.proveedorId) {
      const proveedor = await prisma.proveedor.findFirst({
        where: { id: validation.data.proveedorId, tenantId: session.tenantId },
      });
      if (!proveedor) {
        return NextResponse.json(
          { success: false, error: "Proveedor no encontrado" },
          { status: 400 }
        );
      }
    }

    if (validation.data.codigoBarras) {
      const existingBarcode = await prisma.producto.findUnique({
        where: { codigoBarras: validation.data.codigoBarras },
      });
      if (existingBarcode) {
        return NextResponse.json(
          { success: false, error: "El código de barras ya está en uso" },
          { status: 400 }
        );
      }
    }

    const producto = await prisma.producto.create({
      data: {
        codigo: validation.data.codigo,
        nombre: validation.data.nombre,
        descripcion: validation.data.descripcion ?? null,
        categoriaId: validation.data.categoriaId,
        unidadMedida: validation.data.unidadMedida,
        costoUnit: validation.data.costoUnit,
        precioUnit: validation.data.precioUnit,
        stockMin: validation.data.stockMin,
        stockMax: validation.data.stockMax,
        codigoBarras: validation.data.codigoBarras ?? null,
        sku: validation.data.sku ?? null,
        imagen: validation.data.imagen ?? null,
        proveedorId: validation.data.proveedorId ?? null,
        estado: validation.data.estado,
        tenantId: session.tenantId,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...producto,
          costoUnit: Number(producto.costoUnit),
          precioUnit: Number(producto.precioUnit),
        },
        message: "Producto creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Productos POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
