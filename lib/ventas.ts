// Helpers compartidos del ciclo comercial (ventas, stock).

export interface VentaItemInput {
  productoId: string;
  cantidad: number;
  precioUnit: number;
  descuento?: number;
}

export async function generarNumero(tx: any, model: string, tenantId: string, prefix: string): Promise<string> {
  const count = await tx[model].count({ where: { tenantId } });
  return `${prefix}-${String(count + 1).padStart(6, "0")}`;
}

export interface SalidaParams {
  bodegaId: string;
  productoId: string;
  cantidad: number;
  usuarioId: string;
  tenantId: string;
  documento: string;
  notas?: string | null;
}

export async function aplicarSalida(tx: any, p: SalidaParams): Promise<number> {
  const inv = await tx.inventario.findUnique({
    where: { bodegaId_productoId_lote: { bodegaId: p.bodegaId, productoId: p.productoId, lote: "" } },
  });
  const producto = await tx.producto.findUnique({ where: { id: p.productoId } });
  const cantAnterior = inv?.cantidad ?? 0;
  if (cantAnterior < p.cantidad) {
    throw new Error(`Stock insuficiente para ${producto?.nombre ?? "el producto"} (disponible: ${cantAnterior})`);
  }
  const cantNueva = cantAnterior - p.cantidad;
  if (inv) {
    await tx.inventario.update({ where: { id: inv.id }, data: { cantidad: cantNueva } });
  }
  const costo = Number(producto?.costoUnit ?? 0);
  await tx.movimiento.create({
    data: {
      tipo: "SALIDA",
      cantidad: p.cantidad,
      cantAnterior,
      cantNueva,
      costoUnit: costo,
      total: costo * p.cantidad,
      bodegaId: p.bodegaId,
      productoId: p.productoId,
      usuarioId: p.usuarioId,
      notas: p.notas ?? null,
      documento: p.documento,
      tenantId: p.tenantId,
    },
  });
  return costo;
}

export function calcularTotales(
  items: VentaItemInput[],
  descuentoGlobal: number,
  impuestoPct: number
): { subtotal: number; descuento: number; impuesto: number; total: number } {
  const subtotal = items.reduce((s, it) => {
    const linea = it.cantidad * it.precioUnit * (1 - (it.descuento ?? 0) / 100);
    return s + linea;
  }, 0);
  const descuento = Math.min(descuentoGlobal, subtotal);
  const base = subtotal - descuento;
  const impuesto = (base * impuestoPct) / 100;
  const total = base + impuesto;
  return {
    subtotal: redondear(subtotal),
    descuento: redondear(descuento),
    impuesto: redondear(impuesto),
    total: redondear(total),
  };
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
