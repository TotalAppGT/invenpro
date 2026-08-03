export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import type { PrismaClient } from "@prisma/client";
import { conteoSchema } from "@/lib/validations";

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
    const bodegaId = searchParams.get("bodegaId") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };

    if (estado && ["ABIERTO", "EN_PROCESO", "CERRADO", "CONCILIADO"].includes(estado)) {
      where.estado = estado;
    }
    if (bodegaId) {
      where.bodegaId = bodegaId;
    }

    const [total, conteos] = await Promise.all([
      prisma.conteo.count({ where }),
      prisma.conteo.findMany({
        where,
        include: {
          bodega: { select: { id: true, nombre: true } },
          usuario: { select: { id: true, nombre: true } },
          items: {
            include: {
              producto: { select: { id: true, codigo: true, nombre: true, costoUnit: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: conteos.map((c: { id: string; estado: string; bodega: { id: string; nombre: string }; usuario: { id: string; nombre: string }; notas: string | null; fechaInicio: Date; fechaFin: Date | null; createdAt: Date; items: Array<{ id: string; diferencia: number; producto: { id: string; codigo: string; nombre: string }; cantidadSistema: number; cantidadFisica: number; notas: string | null }> }) => ({
        id: c.id,
        estado: c.estado,
        bodega: c.bodega,
        usuario: c.usuario,
        notas: c.notas,
        fechaInicio: c.fechaInicio,
        fechaFin: c.fechaFin,
        itemsCount: c.items.length,
        diferencias: c.items.filter((i: { diferencia: number }) => i.diferencia !== 0).length,
        items: c.items.map((i: { id: string; diferencia: number; producto: { id: string; codigo: string; nombre: string }; cantidadSistema: number; cantidadFisica: number; notas: string | null }) => ({
          id: i.id,
          producto: i.producto,
          cantidadSistema: i.cantidadSistema,
          cantidadFisica: i.cantidadFisica,
          diferencia: i.diferencia,
          notas: i.notas,
        })),
        createdAt: c.createdAt,
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
    console.error("Conteos GET error:", error);
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
    const { bodegaId, notas } = body;

    if (!bodegaId) {
      return NextResponse.json(
        { success: false, error: "bodegaId es obligatorio" },
        { status: 400 }
      );
    }

    const bodega = await prisma.bodega.findFirst({
      where: { id: bodegaId, tenantId: session.tenantId },
    });

    if (!bodega) {
      return NextResponse.json(
        { success: false, error: "Bodega no encontrada" },
        { status: 404 }
      );
    }

    const inventarioItems = await prisma.inventario.findMany({
      where: { bodegaId, cantidad: { gt: 0 } },
      include: {
        producto: { select: { id: true, nombre: true, codigo: true, costoUnit: true } },
      },
    });

    if (inventarioItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "La bodega no tiene productos con stock para contar" },
        { status: 400 }
      );
    }

    const conteo = await prisma.conteo.create({
      data: {
        estado: "ABIERTO",
        bodegaId,
        usuarioId: session.uid,
        tenantId: session.tenantId,
        notas: notas ?? null,
        items: {
          create: inventarioItems.map((inv: { productoId: string; cantidad: number }) => ({
            productoId: inv.productoId,
            cantidadSistema: inv.cantidad,
            cantidadFisica: 0,
            diferencia: 0,
          })),
        },
      },
      include: {
        bodega: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: conteo.id,
          estado: conteo.estado,
          bodega: conteo.bodega,
          usuario: conteo.usuario,
          notas: conteo.notas,
          fechaInicio: conteo.fechaInicio,
          items: conteo.items.map((i: { id: string; producto: { id: string; codigo: string; nombre: string }; cantidadSistema: number; cantidadFisica: number; diferencia: number; notas: string | null }) => ({
            id: i.id,
            producto: i.producto,
            cantidadSistema: i.cantidadSistema,
            cantidadFisica: i.cantidadFisica,
            diferencia: i.diferencia,
          })),
          itemsCount: conteo.items.length,
        },
        message: "Conteo creado exitosamente",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Conteos POST error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
