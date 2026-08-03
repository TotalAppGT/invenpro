import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { alertaSchema } from "@/lib/validations";

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

    const existing = await prisma.alerta.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Alerta no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = alertaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const alerta = await prisma.alerta.update({
      where: { id },
      data: {
        tipo: validation.data.tipo,
        mensaje: validation.data.mensaje,
        productoId: validation.data.productoId ?? null,
        destinatarios: validation.data.destinatarios,
        canal: validation.data.canal,
        programacion: validation.data.programacion ?? null,
        activa: validation.data.activa,
      },
      include: {
        producto: { select: { id: true, nombre: true, codigo: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: alerta,
      message: "Alerta actualizada exitosamente",
    });
  } catch (error) {
    console.error("Alertas PUT error:", error);
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

    const existing = await prisma.alerta.findFirst({
      where: { id, tenantId: session.tenantId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Alerta no encontrada" },
        { status: 404 }
      );
    }

    await prisma.alerta.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Alerta eliminada exitosamente",
    });
  } catch (error) {
    console.error("Alertas DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
