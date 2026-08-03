import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { alertaSchema } from "@/lib/validations";

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
    const tipo = searchParams.get("tipo") ?? "";
    const activa = searchParams.get("activa") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (tipo && ["STOCK_BAJO", "VENCIMIENTO", "MOVIMIENTO", "PERSONALIZADA"].includes(tipo)) {
      where.tipo = tipo;
    }
    if (activa === "true") {
      where.activa = true;
    } else if (activa === "false") {
      where.activa = false;
    }

    const [total, alertas] = await Promise.all([
      prisma.alerta.count({ where }),
      prisma.alerta.findMany({
        where,
        include: {
          producto: { select: { id: true, nombre: true, codigo: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: alertas.map((a: { id: string; tipo: string; mensaje: string; producto: { id: string; nombre: string; codigo: string } | null; destinatarios: string[]; canal: string[]; programacion: string | null; activa: boolean; ultimoEnvio: Date | null; createdAt: Date; updatedAt: Date }) => ({
        id: a.id,
        tipo: a.tipo,
        mensaje: a.mensaje,
        producto: a.producto,
        destinatarios: a.destinatarios,
        canal: a.canal,
        programacion: a.programacion,
        activa: a.activa,
        ultimoEnvio: a.ultimoEnvio,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
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
    console.error("Alertas GET error:", error);
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

    const body = await request.json();
    const validation = alertaSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    if (validation.data.productoId) {
      const producto = await prisma.producto.findFirst({
        where: { id: validation.data.productoId, tenantId: session.tenantId },
      });
      if (!producto) {
        return NextResponse.json(
          { success: false, error: "Producto no encontrado" },
          { status: 400 }
        );
      }
    }

    const alerta = await prisma.alerta.create({
      data: {
        tipo: validation.data.tipo,
        mensaje: validation.data.mensaje,
        productoId: validation.data.productoId ?? null,
        destinatarios: validation.data.destinatarios,
        canal: validation.data.canal,
        programacion: validation.data.programacion ?? null,
        activa: validation.data.activa,
        tenantId: session.tenantId,
      },
      include: {
        producto: { select: { id: true, nombre: true, codigo: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: alerta,
        message: "Alerta creada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Alertas POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
