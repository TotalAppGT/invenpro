import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { proveedorSchema } from "@/lib/validations";

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

    const existing = await prisma.proveedor.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = proveedorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre: validation.data.nombre,
        nit: validation.data.nit ?? null,
        direccion: validation.data.direccion ?? null,
        telefono: validation.data.telefono ?? null,
        email: validation.data.email || null,
        contacto: validation.data.contacto ?? null,
        notas: validation.data.notas ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: proveedor,
      message: "Proveedor actualizado exitosamente",
    });
  } catch (error) {
    console.error("Proveedores PUT error:", error);
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

    const proveedor = await prisma.proveedor.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    await prisma.producto.updateMany({
      where: { proveedorId: id },
      data: { proveedorId: null },
    });

    await prisma.proveedor.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Proveedor eliminado exitosamente. Los productos asociados se han desvinculado.",
    });
  } catch (error) {
    console.error("Proveedores DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
