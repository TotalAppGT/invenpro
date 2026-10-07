export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { cajaMovimientoSchema } from "@/lib/validations";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const caja = await prisma.caja.findFirst({ where: { id: params.id, tenantId: session.tenantId } });
    if (!caja) return NextResponse.json({ success: false, error: "Caja no encontrada" }, { status: 404 });
    if (caja.estado === "CERRADA") return NextResponse.json({ success: false, error: "La caja está cerrada" }, { status: 400 });

    const body = await request.json();
    const validation = cajaMovimientoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }
    const data = validation.data;

    const mov = await prisma.movimientoCaja.create({
      data: { cajaId: caja.id, tipo: data.tipo, monto: data.monto, concepto: data.concepto, referencia: data.referencia ?? null },
    });

    return NextResponse.json({ success: true, data: mov, message: "Movimiento de caja registrado" }, { status: 201 });
  } catch (error) {
    console.error("Caja movimiento POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
