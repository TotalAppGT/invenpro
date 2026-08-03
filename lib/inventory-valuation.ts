export interface ValuationMovement {
  id: string;
  fecha: Date;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE" | "TRASLADO" | "CONTEO_DIFERENCIA";
  cantidad: number;
  costoUnit: number;
  total: number;
  documento: string | null;
  detalle: string | null;
}

export interface KardexEntry {
  fecha: Date;
  tipo: string;
  documento: string | null;
  detalle: string | null;
  entradaCant: number;
  entradaCostoUnit: number;
  entradaTotal: number;
  salidaCant: number;
  salidaCostoUnit: number;
  salidaTotal: number;
  saldoCant: number;
  saldoCostoUnit: number;
  saldoTotal: number;
}

interface FifoLot {
  cantidad: number;
  costoUnit: number;
}

const getMovementQuantity = (m: ValuationMovement): number => {
  if (m.tipo === "SALIDA") return -m.cantidad;
  if (m.tipo === "ENTRADA") return m.cantidad;
  if (m.tipo === "AJUSTE" || m.tipo === "CONTEO_DIFERENCIA") {
    return m.cantidad;
  }
  return 0;
};

const isEntryType = (tipo: string): boolean => {
  return tipo === "ENTRADA" || tipo === "AJUSTE";
};

const isExitType = (tipo: string): boolean => {
  return tipo === "SALIDA" || tipo === "CONTEO_DIFERENCIA";
};

export function calculateFIFO(movements: ValuationMovement[]): KardexEntry[] {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const lots: FifoLot[] = [];
  const entries: KardexEntry[] = [];
  let saldoCant = 0;

  for (const mov of sorted) {
    const entry: KardexEntry = {
      fecha: mov.fecha,
      tipo: mov.tipo,
      documento: mov.documento,
      detalle: mov.detalle,
      entradaCant: 0,
      entradaCostoUnit: 0,
      entradaTotal: 0,
      salidaCant: 0,
      salidaCostoUnit: 0,
      salidaTotal: 0,
      saldoCant: 0,
      saldoCostoUnit: 0,
      saldoTotal: 0,
    };

    if (isEntryType(mov.tipo)) {
      const costo = mov.costoUnit ?? 0;
      lots.push({ cantidad: mov.cantidad, costoUnit: costo });
      saldoCant += mov.cantidad;
      entry.entradaCant = mov.cantidad;
      entry.entradaCostoUnit = costo;
      entry.entradaTotal = mov.cantidad * costo;
    } else {
      let remaining = mov.cantidad;
      let costoTotalSalida = 0;
      const exitCosts: number[] = [];

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.cantidad);
        costoTotalSalida += take * lot.costoUnit;
        exitCosts.push(lot.costoUnit);
        lot.cantidad -= take;
        remaining -= take;
        if (lot.cantidad === 0) lots.shift();
      }

      saldoCant -= mov.cantidad;
      if (saldoCant < 0) saldoCant = 0;

      const avgExitCost =
        costoTotalSalida > 0
          ? costoTotalSalida / (mov.cantidad - remaining)
          : mov.costoUnit ?? 0;

      entry.salidaCant = mov.cantidad;
      entry.salidaCostoUnit = avgExitCost;
      entry.salidaTotal = costoTotalSalida;
    }

    entry.saldoCant = saldoCant;

    if (saldoCant > 0) {
      let totalValue = 0;
      for (const lot of lots) {
        totalValue += lot.cantidad * lot.costoUnit;
      }
      entry.saldoCostoUnit = totalValue / saldoCant;
      entry.saldoTotal = totalValue;
    }

    entries.push(entry);
  }

  return entries;
}

export function calculateLIFO(movements: ValuationMovement[]): KardexEntry[] {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const lots: FifoLot[] = [];
  const entries: KardexEntry[] = [];
  let saldoCant = 0;

  for (const mov of sorted) {
    const entry: KardexEntry = {
      fecha: mov.fecha,
      tipo: mov.tipo,
      documento: mov.documento,
      detalle: mov.detalle,
      entradaCant: 0,
      entradaCostoUnit: 0,
      entradaTotal: 0,
      salidaCant: 0,
      salidaCostoUnit: 0,
      salidaTotal: 0,
      saldoCant: 0,
      saldoCostoUnit: 0,
      saldoTotal: 0,
    };

    if (isEntryType(mov.tipo)) {
      const costo = mov.costoUnit ?? 0;
      lots.push({ cantidad: mov.cantidad, costoUnit: costo });
      saldoCant += mov.cantidad;
      entry.entradaCant = mov.cantidad;
      entry.entradaCostoUnit = costo;
      entry.entradaTotal = mov.cantidad * costo;
    } else {
      let remaining = mov.cantidad;
      let costoTotalSalida = 0;

      while (remaining > 0 && lots.length > 0) {
        const lot = lots[lots.length - 1];
        const take = Math.min(remaining, lot.cantidad);
        costoTotalSalida += take * lot.costoUnit;
        lot.cantidad -= take;
        remaining -= take;
        if (lot.cantidad === 0) lots.pop();
      }

      saldoCant -= mov.cantidad;
      if (saldoCant < 0) saldoCant = 0;

      const avgExitCost =
        costoTotalSalida > 0
          ? costoTotalSalida / (mov.cantidad - remaining)
          : mov.costoUnit ?? 0;

      entry.salidaCant = mov.cantidad;
      entry.salidaCostoUnit = avgExitCost;
      entry.salidaTotal = costoTotalSalida;
    }

    entry.saldoCant = saldoCant;

    if (saldoCant > 0) {
      let totalValue = 0;
      for (const lot of lots) {
        totalValue += lot.cantidad * lot.costoUnit;
      }
      entry.saldoCostoUnit = totalValue / saldoCant;
      entry.saldoTotal = totalValue;
    }

    entries.push(entry);
  }

  return entries;
}

export function calculateWeightedAverage(movements: ValuationMovement[]): KardexEntry[] {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const entries: KardexEntry[] = [];
  let saldoCant = 0;
  let saldoTotal = 0;

  for (const mov of sorted) {
    const entry: KardexEntry = {
      fecha: mov.fecha,
      tipo: mov.tipo,
      documento: mov.documento,
      detalle: mov.detalle,
      entradaCant: 0,
      entradaCostoUnit: 0,
      entradaTotal: 0,
      salidaCant: 0,
      salidaCostoUnit: 0,
      salidaTotal: 0,
      saldoCant: 0,
      saldoCostoUnit: 0,
      saldoTotal: 0,
    };

    if (isEntryType(mov.tipo)) {
      const costo = mov.costoUnit ?? 0;
      const entradaTotal = mov.cantidad * costo;
      saldoTotal += entradaTotal;
      saldoCant += mov.cantidad;
      entry.entradaCant = mov.cantidad;
      entry.entradaCostoUnit = costo;
      entry.entradaTotal = entradaTotal;
    } else {
      const avgCosto = saldoCant > 0 ? saldoTotal / saldoCant : mov.costoUnit ?? 0;
      const salidaTotal = mov.cantidad * avgCosto;
      saldoTotal -= salidaTotal;
      saldoCant -= mov.cantidad;
      if (saldoTotal < 0) saldoTotal = 0;
      if (saldoCant < 0) saldoCant = 0;

      entry.salidaCant = mov.cantidad;
      entry.salidaCostoUnit = avgCosto;
      entry.salidaTotal = salidaTotal;
    }

    entry.saldoCant = saldoCant;
    entry.saldoCostoUnit = saldoCant > 0 ? saldoTotal / saldoCant : 0;
    entry.saldoTotal = saldoTotal;

    entries.push(entry);
  }

  return entries;
}

export function calculateKardex(
  movements: ValuationMovement[],
  method: "PEPS" | "UEPS" | "PROMEDIO"
): KardexEntry[] {
  switch (method) {
    case "PEPS":
      return calculateFIFO(movements);
    case "UEPS":
      return calculateLIFO(movements);
    case "PROMEDIO":
      return calculateWeightedAverage(movements);
    default:
      return calculateWeightedAverage(movements);
  }
}

export interface InventoryItem {
  productoId: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  costoUnit: number;
}

export function calculateInventoryValue(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.cantidad * item.costoUnit, 0);
}

export interface StockRotationInput {
  costoVentas: number;
  inventarioPromedio: number;
}

export function calculateStockRotation(input: StockRotationInput): number {
  if (input.inventarioPromedio === 0) return 0;
  return input.costoVentas / input.inventarioPromedio;
}

export function calculateDaysOfInventory(
  inventarioPromedio: number,
  costoVentas: number,
  periodoDias = 365
): number {
  if (costoVentas === 0) return 0;
  return (inventarioPromedio / costoVentas) * periodoDias;
}

export interface SlowMovingItem extends InventoryItem {
  lastMovementDate: Date | null;
  daysWithoutMovement: number;
}

export function detectSlowMoving(
  items: InventoryItem[],
  lastMovementDates: Map<string, Date | null>,
  thresholdDays: number
): SlowMovingItem[] {
  const now = new Date();
  return items
    .map((item) => {
      const lastDate = lastMovementDates.get(item.productoId) ?? null;
      const daysWithout = lastDate
        ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        : 9999;
      return { ...item, lastMovementDate: lastDate, daysWithoutMovement: daysWithout };
    })
    .filter((item) => item.daysWithoutMovement >= thresholdDays)
    .sort((a, b) => b.daysWithoutMovement - a.daysWithoutMovement);
}

export function calculateReorderPoint(
  avgDailyUsage: number,
  leadTime: number,
  safetyStock: number
): number {
  return Math.ceil(avgDailyUsage * leadTime + safetyStock);
}

export function calculateEconomicOrderQuantity(
  annualDemand: number,
  orderingCost: number,
  holdingCostPerUnit: number
): number {
  if (holdingCostPerUnit === 0) return 0;
  return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit));
}

export function calculateSafetyStock(
  maxDailyUsage: number,
  avgDailyUsage: number,
  maxLeadTime: number,
  avgLeadTime: number,
  serviceLevelZ = 1.65
): number {
  const usageStdDev = (maxDailyUsage - avgDailyUsage) / 3;
  const leadTimeStdDev = (maxLeadTime - avgLeadTime) / 3;
  const demandVariance =
    avgLeadTime * usageStdDev * usageStdDev +
    avgDailyUsage * avgDailyUsage * leadTimeStdDev * leadTimeStdDev;
  return Math.ceil(serviceLevelZ * Math.sqrt(Math.max(0, demandVariance)));
}

export function calculateTotalKardexSummary(entries: KardexEntry[]) {
  const totalEntradas = entries.reduce((s, e) => s + e.entradaCant, 0);
  const totalSalidas = entries.reduce((s, e) => s + e.salidaCant, 0);
  const totalEntradasValor = entries.reduce((s, e) => s + e.entradaTotal, 0);
  const totalSalidasValor = entries.reduce((s, e) => s + e.salidaTotal, 0);
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return {
    totalEntradas,
    totalSalidas,
    totalEntradasValor,
    totalSalidasValor,
    stockActual: lastEntry?.saldoCant ?? 0,
    valorTotal: lastEntry?.saldoTotal ?? 0,
    costoPromedio: lastEntry?.saldoCostoUnit ?? 0,
  };
}
