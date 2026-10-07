export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { notaSchema } from "@/lib/validations";
import { generarNumero, redondear } from "@/lib/ventas";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (tipo) where.tipo = tipo;

    const [total, notas] = await Promise.all([
      prisma.notaCreditoDebito.count({ where }),
      prisma.notaCreditoDebito.findMany({
        where,
        include: {
          cliente: { select: { id: true, nombre: true } },
          venta: { select: { id: true, numero: true } },
          usuario: { select: { id: true, nombre: true } },
        },
        orderBy: { fecha: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: notas.map((n: any) => ({ ...n, monto: Number(n.monto) })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
    });
  } catch (error) {
    console.error("Notas GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = notaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const nota = await prisma.$transaction(async (tx) => {
      const numero = await generarNumero(tx, "notaCreditoDebito", session.tenantId, data.tipo === "CREDITO" ? "NC" : "ND");
      const n = await tx.notaCreditoDebito.create({
        data: {
          numero, tipo: data.tipo, motivo: data.motivo, monto: data.monto,
          ventaId: data.ventaId ?? null, clienteId: data.clienteId ?? null,
          usuarioId: session.uid, tenantId: session.tenantId,
        },
      });

      // La nota de crédito disminuye el saldo del cliente; la de débito lo aumenta.
      if (data.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } });
        if (cliente) {
          const delta = data.tipo === "CREDITO" ? -data.monto : data.monto;
          const nuevo = Math.max(0, redondear(Number(cliente.saldo) + delta));
          await tx.cliente.update({ where: { id: data.clienteId }, data: { saldo: nuevo } });
        }
      }
      return n;
    });

    return NextResponse.json({ success: true, data: nota, message: `Nota ${nota.numero} registrada` }, { status: 201 });
  } catch (error) {
    console.error("Notas POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
