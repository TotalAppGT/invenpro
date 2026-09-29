export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, getPlanLimits } from "@/lib/auth";
import { clienteSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (search.trim()) {
      where.OR = [
        { nombre: { contains: search.trim(), mode: "insensitive" } },
        { nit: { contains: search.trim(), mode: "insensitive" } },
        { telefono: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const [total, clientes] = await Promise.all([
      prisma.cliente.count({ where }),
      prisma.cliente.findMany({
        where,
        include: {
          listaPrecio: { select: { id: true, nombre: true } },
          _count: { select: { ventas: true } },
        },
        orderBy: { nombre: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: clientes.map((c: any) => ({
        ...c,
        limiteCredito: Number(c.limiteCredito),
        saldo: Number(c.saldo),
        ventasCount: c._count.ventas,
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
    console.error("Clientes GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }

    const limits = getPlanLimits(session.tenantPlan);
    if (limits.maxMovimientos !== Infinity) {
      // sin límite específico de clientes; se valida contra productos para consistencia de plan
    }

    const body = await request.json();
    const validation = clienteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    if (data.listaPrecioId) {
      const lista = await prisma.listaPrecio.findFirst({ where: { id: data.listaPrecioId, tenantId: session.tenantId } });
      if (!lista) return NextResponse.json({ success: false, error: "Lista de precios no encontrada" }, { status: 404 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: data.nombre,
        nit: data.nit ?? null,
        direccion: data.direccion ?? null,
        telefono: data.telefono ?? null,
        email: data.email || null,
        contacto: data.contacto ?? null,
        listaPrecioId: data.listaPrecioId ?? null,
        limiteCredito: data.limiteCredito ?? 0,
        diasCredito: data.diasCredito ?? 0,
        activo: data.activo ?? true,
        notas: data.notas ?? null,
        tenantId: session.tenantId,
      },
    });

    return NextResponse.json({ success: true, data: cliente, message: "Cliente creado" }, { status: 201 });
  } catch (error) {
    console.error("Clientes POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
