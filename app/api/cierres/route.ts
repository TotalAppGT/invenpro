export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { z } from "zod";

const cierreCreateSchema = z.object({
  fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria"),
  fechaFin: z.string().min(1, "La fecha de fin es obligatoria"),
  bodegaId: z.string().optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
});

const cierreUpdateSchema = z.object({
  notas: z.string().max(500).optional(),
  estado: z.enum(["ABIERTO", "CERRADO", "CONCILIADO"]).optional(),
});

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
    const bodegaId = searchParams.get("bodegaId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const id = searchParams.get("id");

    if (id) {
      const cierre = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "CierreInventario" WHERE "id" = $1 AND "tenantId" = $2`,
        id,
        session.tenantId
      );

      if (!cierre || cierre.length === 0) {
        return NextResponse.json(
          { success: false, error: "Cierre no encontrado" },
          { status: 404 }
        );
      }

      const cierreData = cierre[0];

      const movimientos = await prisma.movimiento.findMany({
        where: {
          tenantId: session.tenantId,
          fecha: {
            gte: new Date(cierreData.fechaInicio),
            lte: new Date(cierreData.fechaFin),
          },
          ...(cierreData.bodegaId ? { bodegaId: cierreData.bodegaId } : {}),
        },
        orderBy: { fecha: "asc" },
        include: {
          producto: { select: { id: true, nombre: true, codigo: true } },
          bodega: { select: { id: true, nombre: true } },
        },
      });

      return NextResponse.json({
        success: true,
        data: { cierre: cierreData, movimientos },
      });
    }

    const whereClause: Record<string, unknown> = {
      tenantId: session.tenantId,
    };
    if (bodegaId) {
      whereClause.bodegaId = bodegaId;
    }

    const [total, cierres] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*)::int as count FROM "CierreInventario" WHERE "tenantId" = $1 ${
          bodegaId ? `AND "bodegaId" = $2` : ""
        }`,
        session.tenantId,
        ...(bodegaId ? [bodegaId] : [])
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "CierreInventario" WHERE "tenantId" = $1 ${
          bodegaId ? `AND "bodegaId" = $2` : ""
        } ORDER BY "createdAt" DESC LIMIT $${bodegaId ? 3 : 2} OFFSET $${
          bodegaId ? 4 : 3
        }`,
        session.tenantId,
        ...(bodegaId ? [bodegaId] : []),
        limit,
        (page - 1) * limit
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: cierres,
      meta: {
        page,
        limit,
        total: total[0]?.count ?? 0,
        totalPages: Math.ceil((total[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cierres:", error);
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
    const validation = cierreCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { fechaInicio, fechaFin, bodegaId, notas } = validation.data;

    const whereMovimientos: Record<string, unknown> = {
      tenantId: session.tenantId,
      fecha: {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      },
    };
    if (bodegaId) {
      whereMovimientos.bodegaId = bodegaId;
    }

    const movimientosEnPeriodo = await prisma.movimiento.findMany({
      where: whereMovimientos as any,
      orderBy: { fecha: "asc" },
    });

    let valorInicial = 0;
    if (bodegaId) {
      const inventarioInicial = await prisma.inventario.findMany({
        where: { bodegaId },
        include: { producto: { select: { costoUnit: true } } },
      });
      valorInicial = inventarioInicial.reduce(
        (sum, inv) => sum + inv.cantidad * Number(inv.producto.costoUnit),
        0
      );
    }

    let valorFinal = valorInicial;
    for (const mov of movimientosEnPeriodo) {
      const costo = Number(mov.costoUnit ?? 0);
      if (mov.tipo === "ENTRADA" || mov.tipo === "AJUSTE") {
        valorFinal += mov.cantidad * costo;
      } else if (
        mov.tipo === "SALIDA" ||
        mov.tipo === "TRASLADO" ||
        mov.tipo === "CONTEO_DIFERENCIA"
      ) {
        valorFinal -= mov.cantidad * costo;
      }
    }

    const diferencia = valorFinal - valorInicial;

    const cierre = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO "CierreInventario" ("id", "tenantId", "bodegaId", "fechaInicio", "fechaFin", "valorInicial", "valorFinal", "diferencia", "estado", "notas", "usuarioId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      crypto.randomUUID(),
      session.tenantId,
      bodegaId || null,
      new Date(fechaInicio),
      new Date(fechaFin),
      valorInicial,
      valorFinal,
      diferencia,
      "CERRADO",
      notas || null,
      session.uid,
      new Date(),
      new Date()
    );

    return NextResponse.json({
      success: true,
      data: cierre[0],
      message: "Cierre de inventario creado exitosamente",
    });
  } catch (error) {
    console.error("Error creating cierre:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "El parámetro id es obligatorio" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = cierreUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "CierreInventario" WHERE "id" = $1 AND "tenantId" = $2`,
      id,
      session.tenantId
    );

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cierre no encontrado" },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validation.data.notas !== undefined) {
      updates.push(`"notas" = $${paramIndex}`);
      values.push(validation.data.notas);
      paramIndex++;
    }

    if (validation.data.estado) {
      updates.push(`"estado" = $${paramIndex}`);
      values.push(validation.data.estado);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    updates.push(`"updatedAt" = $${paramIndex}`);
    values.push(new Date());
    paramIndex++;

    values.push(id, session.tenantId);

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE "CierreInventario" SET ${updates.join(", ")} WHERE "id" = $${paramIndex} AND "tenantId" = $${paramIndex + 1} RETURNING *`,
      ...values
    );

    return NextResponse.json({
      success: true,
      data: updated[0],
      message: "Cierre actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating cierre:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
