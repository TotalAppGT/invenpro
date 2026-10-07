export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") ?? "";
    const clienteId = searchParams.get("clienteId") ?? "";

    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (estado) where.estado = estado;
    if (clienteId) where.clienteId = clienteId;

    const cuentas = await prisma.cuentaPorCobrar.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, nit: true, telefono: true } },
        venta: { select: { id: true, numero: true } },
      },
      orderBy: { vencimiento: "asc" },
    });

    const ahora = Date.now();
    const data = cuentas.map((c: any) => {
      const vencida = c.estado !== "PAGADA" && c.estado !== "ANULADA" && new Date(c.vencimiento).getTime() < ahora;
      return {
        id: c.id, cliente: c.cliente, venta: c.venta,
        monto: Number(c.monto), saldo: Number(c.saldo),
        fecha: c.fecha, vencimiento: c.vencimiento,
        estado: vencida ? "VENCIDA" : c.estado,
        diasVencido: vencida ? Math.floor((ahora - new Date(c.vencimiento).getTime()) / 86400000) : 0,
      };
    });

    const totalPendiente = data.filter((c) => c.estado !== "PAGADA" && c.estado !== "ANULADA").reduce((s, c) => s + c.saldo, 0);
    const vencidas = data.filter((c) => c.estado === "VENCIDA").length;

    return NextResponse.json({ success: true, data, meta: { total: data.length, totalPendiente, vencidas } });
  } catch (error) {
    console.error("CxC GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
