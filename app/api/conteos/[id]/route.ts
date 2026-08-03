import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

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

    const conteo = await prisma.conteo.findFirst({
      where: { id, tenantId: session.tenantId },
      include: { items: true },
    });

    if (!conteo) {
      return NextResponse.json(
        { success: false, error: "Conteo no encontrado" },
        { status: 404 }
      );
    }

    if (conteo.estado === "CERRADO" || conteo.estado === "CONCILIADO") {
      return NextResponse.json(
        { success: false, error: "No se puede modificar un conteo cerrado o conciliado" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { items, estado, notas } = body;

    if (estado) {
      await prisma.conteo.update({
        where: { id },
        data: { estado: "EN_PROCESO" },
      });
    }

    if (notas !== undefined) {
      await prisma.conteo.update({
        where: { id },
        data: { notas },
      });
    }

    let updatedItems: unknown[] = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.productoId || item.cantidadFisica === undefined) continue;

        const existingItem = await prisma.conteoItem.findFirst({
          where: { conteoId: id, productoId: item.productoId },
        });

        if (existingItem) {
          const cantidadFisica = parseInt(item.cantidadFisica, 10) || 0;
          const diferencia = cantidadFisica - existingItem.cantidadSistema;

          const updated = await prisma.conteoItem.update({
            where: { id: existingItem.id },
            data: {
              cantidadFisica,
              diferencia,
              notas: item.notas ?? null,
            },
            include: {
              producto: { select: { id: true, codigo: true, nombre: true } },
            },
          });
          updatedItems.push(updated);
        }
      }
    }

    const finalConteo = await prisma.conteo.findUnique({
      where: { id },
      include: {
        bodega: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true, costoUnit: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: finalConteo!.id,
        estado: finalConteo!.estado,
        bodega: finalConteo!.bodega,
        usuario: finalConteo!.usuario,
        notas: finalConteo!.notas,
        fechaInicio: finalConteo!.fechaInicio,
        items: finalConteo!.items.map((i: any) => ({
          id: i.id,
          producto: i.producto,
          cantidadSistema: i.cantidadSistema,
          cantidadFisica: i.cantidadFisica,
          diferencia: i.diferencia,
          notas: i.notas,
        })),
      },
      message: "Conteo actualizado exitosamente",
    });
  } catch (error) {
    console.error("Conteos PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
