import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

type OrdenRow = { id: string; estado: string; proveedorId: string | null; [key: string]: unknown };

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

    const existingRaw = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "OrdenCompra" WHERE "id" = $1 AND "tenantId" = $2`,
      id,
      session.tenantId
    );

    if (!existingRaw || existingRaw.length === 0) {
      return NextResponse.json(
        { success: false, error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    const orden = existingRaw[0] as OrdenRow;
    if (orden.estado !== "PENDIENTE") {
      return NextResponse.json(
        { success: false, error: "Solo se pueden modificar órdenes en estado PENDIENTE" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado, notas, fechaEsperada } = body;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (notas !== undefined) {
      updates.push(`"notas" = $${paramIdx}`);
      values.push(notas);
      paramIdx++;
    }

    if (fechaEsperada !== undefined) {
      updates.push(`"fechaEsperada" = $${paramIdx}`);
      values.push(fechaEsperada ? new Date(fechaEsperada) : null);
      paramIdx++;
    }

    const estadosValidos = ["PENDIENTE", "PARCIAL", "COMPLETADA", "CANCELADA"];
    if (estado && estadosValidos.includes(estado)) {
      updates.push(`"estado" = $${paramIdx}`);
      values.push(estado);
      paramIdx++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    updates.push(`"updatedAt" = $${paramIdx}`);
    values.push(new Date());
    paramIdx++;

    values.push(id, session.tenantId);

    const updatedRaw = await (prisma as any).$queryRawUnsafe(
      `UPDATE "OrdenCompra" SET ${updates.join(", ")} WHERE "id" = $${paramIdx} AND "tenantId" = $${paramIdx + 1} RETURNING *`,
      ...values
    );

    const items = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "OrdenCompraItem" WHERE "ordenCompraId" = $1`,
      id
    );

    return NextResponse.json({
      success: true,
      data: { ...(updatedRaw[0] as OrdenRow), items },
      message: "Orden actualizada exitosamente",
    });
  } catch (error) {
    console.error("Ordenes compra PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
