import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

type OrdenRow = { id: string; estado: string; proveedorId: string | null; fechaEsperada: string | null; notas: string | null; total: number; usuarioId: string; createdAt: string; updatedAt: string; [key: string]: unknown };

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
    const estado = searchParams.get("estado") ?? "";
    const proveedorId = searchParams.get("proveedorId") ?? "";
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const whereClauses: string[] = [`"tenantId" = $1`];
    const params: unknown[] = [session.tenantId];
    let paramIndex = 2;

    const estadosValidos = ["PENDIENTE", "PARCIAL", "COMPLETADA", "CANCELADA"];
    if (estado && estadosValidos.includes(estado)) {
      whereClauses.push(`"estado" = $${paramIndex}`);
      params.push(estado);
      paramIndex++;
    }

    if (proveedorId) {
      whereClauses.push(`"proveedorId" = $${paramIndex}`);
      params.push(proveedorId);
      paramIndex++;
    }

    if (desde) {
      whereClauses.push(`"createdAt" >= $${paramIndex}`);
      params.push(new Date(desde));
      paramIndex++;
    }

    if (hasta) {
      whereClauses.push(`"createdAt" <= $${paramIndex}`);
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59, 999);
      params.push(hastaDate);
      paramIndex++;
    }

    const whereStr = whereClauses.join(" AND ");

    const [countResult, ordenesRaw] = await Promise.all([
      (prisma as any).$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "OrdenCompra" WHERE ${whereStr}`,
        ...params
      ) as Promise<Array<{ count: number }>>,
      (prisma as any).$queryRawUnsafe(
        `SELECT * FROM "OrdenCompra" WHERE ${whereStr} ORDER BY "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        ...params,
        limit,
        (page - 1) * limit
      ) as Promise<OrdenRow[]>,
    ]);

    const total = countResult[0]?.count ?? 0;
    const ordenes = ordenesRaw as OrdenRow[];

    const enrichedOrdenes = await Promise.all(
      ordenes.map(async (orden: OrdenRow) => {
        let items: unknown[] = [];
        try {
          items = await (prisma as any).$queryRawUnsafe(
            `SELECT * FROM "OrdenCompraItem" WHERE "ordenCompraId" = $1`,
            orden.id
          );
        } catch {
          items = [];
        }

        let proveedor = null;
        if (orden.proveedorId) {
          proveedor = await prisma.proveedor.findUnique({
            where: { id: orden.proveedorId },
            select: { id: true, nombre: true },
          });
        }

        return {
          ...orden,
          items,
          proveedor,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedOrdenes,
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
    console.error("Ordenes compra GET error:", error);
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
    const { proveedorId, fechaEsperada, notas, items } = body;

    if (!proveedorId) {
      return NextResponse.json(
        { success: false, error: "proveedorId es obligatorio" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Debe incluir al menos un item en la orden" },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.findFirst({
      where: { id: proveedorId, tenantId: session.tenantId },
    });

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    for (const item of items) {
      if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
        return NextResponse.json(
          { success: false, error: "Cada item debe tener productoId y cantidad > 0" },
          { status: 400 }
        );
      }

      const producto = await prisma.producto.findFirst({
        where: { id: item.productoId, tenantId: session.tenantId },
      });
      if (!producto) {
        return NextResponse.json(
          { success: false, error: `Producto ${item.productoId} no encontrado` },
          { status: 404 }
        );
      }
    }

    let total = 0;
    for (const item of items) {
      total += (item.cantidad || 0) * (item.precioUnit || 0);
    }

    const ordenId = crypto.randomUUID();
    const now = new Date();

    const ordenRaw = await (prisma as any).$queryRawUnsafe(
      `INSERT INTO "OrdenCompra" ("id", "tenantId", "proveedorId", "estado", "fechaEsperada", "notas", "total", "usuarioId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      ordenId,
      session.tenantId,
      proveedorId,
      "PENDIENTE",
      fechaEsperada ? new Date(fechaEsperada) : null,
      notas ?? null,
      total,
      session.uid,
      now,
      now
    );
    const orden = ordenRaw[0] as OrdenRow;

    for (const item of items) {
      await (prisma as any).$queryRawUnsafe(
        `INSERT INTO "OrdenCompraItem" ("id", "ordenCompraId", "productoId", "cantidad", "precioUnit", "subtotal", "cantidadRecibida")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        crypto.randomUUID(),
        ordenId,
        item.productoId,
        item.cantidad,
        item.precioUnit ?? 0,
        (item.cantidad || 0) * (item.precioUnit || 0),
        0
      );
    }

    const itemsCreados = await (prisma as any).$queryRawUnsafe(
      `SELECT * FROM "OrdenCompraItem" WHERE "ordenCompraId" = $1`,
      ordenId
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...orden,
          items: itemsCreados,
        },
        message: "Orden de compra creada exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ordenes compra POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
