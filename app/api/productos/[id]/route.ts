import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { productoSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = params;

    const existing = await prisma.producto.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = productoSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    if (validation.data.categoriaId) {
      const categoria = await prisma.categoria.findFirst({
        where: { id: validation.data.categoriaId, tenantId: session.tenantId },
      });
      if (!categoria) {
        return NextResponse.json(
          { success: false, error: "Categoría no encontrada" },
          { status: 400 }
        );
      }
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

    if (validation.data.codigoBarras && validation.data.codigoBarras !== existing.codigoBarras) {
      const existingBarcode = await prisma.producto.findUnique({
        where: { codigoBarras: validation.data.codigoBarras },
      });
      if (existingBarcode && existingBarcode.id !== id) {
        return NextResponse.json(
          { success: false, error: "El código de barras ya está en uso" },
          { status: 400 }
        );
      }
    }

    const producto = await prisma.producto.update({
      where: { id },
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
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...producto,
        costoUnit: Number(producto.costoUnit),
        precioUnit: Number(producto.precioUnit),
      },
      message: "Producto actualizado exitosamente",
    });
  } catch (error) {
    console.error("Productos PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { id } = params;

    const producto = await prisma.producto.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.producto.update({
      where: { id },
      data: { estado: "INACTIVO" },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Producto desactivado exitosamente",
    });
  } catch (error) {
    console.error("Productos DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
