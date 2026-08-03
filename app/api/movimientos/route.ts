import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { movimientosSchema } from "@/lib/validations";
import type { PrismaClient } from "@prisma/client";

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
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const productoId = searchParams.get("productoId") ?? "";
    const desde = searchParams.get("desde") ?? "";
    const hasta = searchParams.get("hasta") ?? "";
    const usuarioId = searchParams.get("usuarioId") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    const validTipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO", "CONTEO_DIFERENCIA"];
    if (tipo && validTipos.includes(tipo)) {
      where.tipo = tipo;
    }
    if (bodegaId) {
      where.OR = [
        { bodegaId },
        { bodegaDestinoId: bodegaId },
      ];
    }
    if (productoId) {
      where.productoId = productoId;
    }
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
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

    const [total, movimientos] = await Promise.all([
      prisma.movimiento.count({ where }),
      prisma.movimiento.findMany({
        where,
        include: {
          producto: { select: { id: true, codigo: true, nombre: true } },
          bodega: { select: { id: true, nombre: true } },
          bodegaDestino: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
        orderBy: { fecha: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: movimientos.map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        fecha: m.fecha,
        cantidad: m.cantidad,
        cantAnterior: m.cantAnterior,
        cantNueva: m.cantNueva,
        costoUnit: Number(m.costoUnit ?? 0),
        total: Number(m.total ?? 0),
        producto: m.producto,
        bodega: m.bodega,
        bodegaDestino: m.bodegaDestino,
        usuario: m.usuario,
        notas: m.notas,
        referencia: m.referencia,
        documento: m.documento,
        createdAt: m.createdAt,
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
    console.error("Movimientos GET error:", error);
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

    const validation = movimientosSchema.safeParse({
      ...body,
      usuarioId: session.uid,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const {
      tipo,
      cantidad,
      costoUnit,
      bodegaId,
      bodegaDestinoId,
      productoId,
      notas,
      referencia,
      documento,
    } = validation.data;

    const [producto, bodega] = await Promise.all([
      prisma.producto.findFirst({
        where: { id: productoId, tenantId: session.tenantId },
      }),
      prisma.bodega.findFirst({
        where: { id: bodegaId, tenantId: session.tenantId },
      }),
    ]);

    if (!producto) {
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }
    if (!bodega) {
      return NextResponse.json(
        { success: false, error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    if (bodegaDestinoId) {
      const bodegaDestino = await prisma.bodega.findFirst({
        where: { id: bodegaDestinoId, tenantId: session.tenantId },
      });
      if (!bodegaDestino) {
        return NextResponse.json(
          { success: false, error: "Bodega de destino no encontrada" },
          { status: 404 }
        );
      }
    }

    const costoUnitNum = costoUnit ?? Number(producto.costoUnit);

    const result = await prisma.$transaction(async (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => {
      let inventory = await tx.inventario.findUnique({
        where: {
          bodegaId_productoId_lote: {
            bodegaId,
            productoId,
            lote: "",
          },
        },
      });

      const cantAnterior = inventory?.cantidad ?? 0;
      let cantNueva = cantAnterior;

      switch (tipo) {
        case "ENTRADA": {
          cantNueva = cantAnterior + cantidad;
          if (inventory) {
            await tx.inventario.update({
              where: { id: inventory.id },
              data: { cantidad: cantNueva },
            });
          } else {
            await tx.inventario.create({
              data: {
                bodegaId,
                productoId,
                cantidad,
                lote: "",
              },
            });
          }
          break;
        }

        case "SALIDA": {
          if (!inventory || inventory.cantidad < cantidad) {
            throw new Error(
              `Stock insuficiente. Disponible: ${inventory?.cantidad ?? 0}, Solicitado: ${cantidad}`
            );
          }
          cantNueva = cantAnterior - cantidad;
          await tx.inventario.update({
            where: { id: inventory.id },
            data: { cantidad: cantNueva },
          });
          break;
        }

        case "AJUSTE": {
          cantNueva = cantidad;
          if (inventory) {
            await tx.inventario.update({
              where: { id: inventory.id },
              data: { cantidad },
            });
          } else {
            await tx.inventario.create({
              data: {
                bodegaId,
                productoId,
                cantidad,
                lote: "",
              },
            });
          }
          break;
        }

        case "TRASLADO": {
          if (!bodegaDestinoId) {
            throw new Error("bodegaDestinoId es obligatorio para traslados");
          }
          if (!inventory || inventory.cantidad < cantidad) {
            throw new Error(
              `Stock insuficiente en origen. Disponible: ${inventory?.cantidad ?? 0}, Solicitado: ${cantidad}`
            );
          }

          cantNueva = cantAnterior - cantidad;
          await tx.inventario.update({
            where: { id: inventory.id },
            data: { cantidad: cantNueva },
          });

          let destInventory = await tx.inventario.findUnique({
            where: {
              bodegaId_productoId_lote: {
                bodegaId: bodegaDestinoId,
                productoId,
                lote: "",
              },
            },
          });

          if (destInventory) {
            await tx.inventario.update({
              where: { id: destInventory.id },
              data: { cantidad: destInventory.cantidad + cantidad },
            });
          } else {
            await tx.inventario.create({
              data: {
                bodegaId: bodegaDestinoId,
                productoId,
                cantidad,
                lote: "",
              },
            });
          }

          await tx.movimiento.create({
            data: {
              tipo: "ENTRADA",
              fecha: new Date(),
              cantidad,
              cantAnterior: destInventory?.cantidad ?? 0,
              cantNueva: (destInventory?.cantidad ?? 0) + cantidad,
              costoUnit: costoUnitNum,
              total: cantidad * costoUnitNum,
              bodegaId: bodegaDestinoId,
              bodegaDestinoId: bodegaId,
              productoId,
              usuarioId: session.uid,
              notas: `Recepción de traslado desde ${bodega.nombre}`,
              tenantId: session.tenantId,
            },
          });
          break;
        }

        default:
          throw new Error(`Tipo de movimiento no soportado: ${tipo}`);
      }

      const movimiento = await tx.movimiento.create({
        data: {
          tipo,
          fecha: new Date(),
          cantidad: tipo === "AJUSTE" ? cantidad - cantAnterior : cantidad,
          cantAnterior,
          cantNueva,
          costoUnit: costoUnitNum,
          total: cantidad * costoUnitNum,
          bodegaId,
          bodegaDestinoId: bodegaDestinoId ?? null,
          productoId,
          usuarioId: session.uid,
          notas: notas ?? null,
          referencia: referencia ?? null,
          documento: documento ?? null,
          tenantId: session.tenantId,
        },
        include: {
          producto: { select: { nombre: true, codigo: true } },
          bodega: { select: { nombre: true } },
          bodegaDestino: { select: { nombre: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      });

      return movimiento;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          tipo: result.tipo,
          fecha: result.fecha,
          cantidad: result.cantidad,
          cantAnterior: result.cantAnterior,
          cantNueva: result.cantNueva,
          costoUnit: Number(result.costoUnit ?? 0),
          total: Number(result.total ?? 0),
          producto: result.producto,
          bodega: result.bodega,
          bodegaDestino: result.bodegaDestino,
          usuario: result.usuario,
          notas: result.notas,
          referencia: result.referencia,
          documento: result.documento,
        },
        message: "Movimiento creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Stock insuficiente")) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    console.error("Movimientos POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
