export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { cajaAbrirSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const cajas = await prisma.caja.findMany({
      where: { tenantId: session.tenantId },
      include: {
        usuario: { select: { id: true, nombre: true } },
        movimientos: { select: { tipo: true, monto: true } },
      },
      orderBy: { apertura: "desc" },
      take: 50,
    });

    const data = cajas.map((c: any) => {
      const ingresos = c.movimientos.filter((m: any) => ["INGRESO", "VENTA", "APERTURA"].includes(m.tipo)).reduce((s: number, m: any) => s + Number(m.monto), 0);
      const egresos = c.movimientos.filter((m: any) => ["EGRESO", "RETIRO", "DEVOLUCION"].includes(m.tipo)).reduce((s: number, m: any) => s + Number(m.monto), 0);
      const esperado = Number(c.montoInicial) + ingresos - egresos;
      return {
        id: c.id, nombre: c.nombre, estado: c.estado, usuario: c.usuario,
        montoInicial: Number(c.montoInicial), montoFinal: c.montoFinal !== null ? Number(c.montoFinal) : null,
        diferencia: c.diferencia !== null ? Number(c.diferencia) : null,
        esperado: Math.round((Number(c.montoInicial) + ingresos - egresos) * 100) / 100,
        movimientosCount: c.movimientos.length,
        apertura: c.apertura, cierre: c.cierre, notas: c.notas,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Cajas GET error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const validation = cajaAbrirSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error.errors[0].message }, { status: 400 });
    }

    const abierta = await prisma.caja.findFirst({ where: { tenantId: session.tenantId, usuarioId: session.uid, estado: "ABIERTA" } });
    if (abierta) {
      return NextResponse.json({ success: false, error: "Ya tienes una caja abierta. Ciérrala antes de abrir otra." }, { status: 400 });
    }

    const caja = await prisma.$transaction(async (tx) => {
      const c = await tx.caja.create({
        data: { nombre: validation.data.nombre, montoInicial: validation.data.montoInicial ?? 0, usuarioId: session.uid, tenantId: session.tenantId },
      });
      await tx.movimientoCaja.create({
        data: { cajaId: c.id, tipo: "APERTURA", monto: validation.data.montoInicial ?? 0, concepto: "Apertura de caja" },
      });
      return c;
    });

    return NextResponse.json({ success: true, data: caja, message: "Caja abierta" }, { status: 201 });
  } catch (error) {
    console.error("Cajas POST error:", error);
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 });
  }
}
