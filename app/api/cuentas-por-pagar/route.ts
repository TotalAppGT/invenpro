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
    const where: Record<string, unknown> = { tenantId: session.tenantId };
    if (estado) where.estado = estado;

    const cuentas = await prisma.cuentaPorPagar.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true, nit: true } },
        ordenCompra: { select: { id: true } },
      },
      orderBy: { vencimiento: "asc" },
    });

    const ahora = Date.now();
    const data = cuentas.map((c: any) => {
      const vencida = c.estado !== "PAGADA" && c.estado !== "ANULADA" && new Date(c.vencimiento).getTime() < ahora;
      return {
        id: c.id, proveedor: c.proveedor, monto: Number(c.monto), saldo: Number(c.saldo),
        fecha: c.fecha, vencimiento: c.vencimiento, estado: vencida ? "VENCIDA" : c.estado,
        diasVencido: vencida ? Math.floor((ahora - new Date(c.vencimiento).getTime()) / 86400000) : 0,
      };
    });

    const totalPendiente = data.filter((c) => c.estado !== "PAGADA" && c.estado !== "ANULADA").reduce((s, c) => s + c.saldo, 0);
    const vencidas = data.filter((c) => c.estado === "VENCIDA").length;
    return NextResponse.json({ success: true, data, meta: { total: data.length, totalPendiente, vencidas } });
  } catch (error) {
    console.error("CxP GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { proveedorId, monto, vencimiento } = body;
    if (!proveedorId || !monto || monto <= 0 || !vencimiento) {
      return NextResponse.json({ success: false, error: "Proveedor, monto y vencimiento son obligatorios" }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.findFirst({ where: { id: proveedorId, tenantId: session.tenantId } });
    if (!proveedor) return NextResponse.json({ success: false, error: "Proveedor no encontrado" }, { status: 404 });

    const cuenta = await prisma.cuentaPorPagar.create({
      data: { proveedorId, monto, saldo: monto, vencimiento: new Date(vencimiento), estado: "PENDIENTE", tenantId: session.tenantId },
    });

    return NextResponse.json({ success: true, data: cuenta, message: "Cuenta por pagar registrada" }, { status: 201 });
  } catch (error) {
    console.error("CxP POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
