"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { BarChart3, TrendingUp, PackageX, Timer } from "lucide-react";

interface ABCItem {
  id: string; codigo: string; nombre: string; categoria: string;
  stockTotal: number; valorInventario: number; cantidadConsumida: number; valorConsumo: number;
  diasSinMovimiento: number; ultimaSalida: string | null; participacion: number; participacionAcumulada: number; claseSugerida: string;
}
interface Data {
  abc: ABCItem[];
  resumenABC: { A: number; B: number; C: number };
  obsoletos: ABCItem[];
  estancados: ABCItem[];
  altaRotacion: ABCItem[];
  totalValorConsumo: number;
  dias: number;
  umbralObsoleto: number;
}

const claseVariant = (c: string) => c === "A" ? "success" : c === "B" ? "warning" : "default";

export default function InventarioProPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);
  const [dias, setDias] = useState(365);
  const [umbral, setUmbral] = useState(90);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api<Data>(`/api/reportes/inventario-pro?dias=${dias}&obsoleto=${umbral}`);
    if (res.success) setData(res.data ?? null);
    else toast.error(res.error);
    setLoading(false);
  }, [dias, umbral]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    if (!data) return { valorTotal: 0, valorObsoleto: 0, valorConsumo: 0 };
    return {
      valorTotal: data.abc.reduce((s, i) => s + i.valorInventario, 0),
      valorObsoleto: data.obsoletos.reduce((s, i) => s + i.valorInventario, 0),
      valorConsumo: data.totalValorConsumo,
    };
  }, [data]);

  if (loading && !data) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inteligencia de Inventario</h1>
          <p className="text-sm text-muted-foreground">Clasificación ABC, rotación y detección de obsoletos</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground">Periodo (días)</label>
            <Input type="number" className="w-28" value={dias} onChange={(e) => setDias(Number(e.target.value) || 365)} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Umbral obsoleto (días)</label>
            <Input type="number" className="w-32" value={umbral} onChange={(e) => setUmbral(Number(e.target.value) || 90)} />
          </div>
          <Button variant="outline" onClick={fetchData}>Aplicar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Valor Inventario", value: formatCurrency(stats.valorTotal), icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Valor Consumo (periodo)", value: formatCurrency(stats.valorConsumo), icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Capital Obsoleto", value: formatCurrency(stats.valorObsoleto), icon: PackageX, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Sin Movimiento", value: (data?.obsoletos.length ?? 0) + (data?.estancados.length ?? 0), icon: Timer, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-lg font-bold text-white">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        {(["A", "B", "C"] as const).map((c) => (
          <Card key={c} className="flex-1 border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Clase {c}</p>
                <p className="text-xl font-bold text-white">{data?.resumenABC[c] ?? 0}</p>
              </div>
              <Badge variant={claseVariant(c) as never}>{c === "A" ? "80% valor" : c === "B" ? "15% valor" : "5% valor"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="abc">
        <TabsList>
          <TabsTrigger value="abc">Clasificación ABC</TabsTrigger>
          <TabsTrigger value="obs">Obsoletos</TabsTrigger>
          <TabsTrigger value="rot">Alta Rotación</TabsTrigger>
        </TabsList>

        <TabsContent value="abc">
          <ABCTable items={data?.abc ?? []} />
        </TabsContent>
        <TabsContent value="obs">
          <ABCTable items={data?.obsoletos ?? []} />
        </TabsContent>
        <TabsContent value="rot">
          <ABCTable items={data?.altaRotacion ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ABCTable({ items }: { items: ABCItem[] }) {
  return (
    <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Producto</th>
                <th className="pb-3 pr-4 font-medium">Categoría</th>
                <th className="pb-3 pr-4 font-medium text-right">Stock</th>
                <th className="pb-3 pr-4 font-medium text-right">Valor Inv.</th>
                <th className="pb-3 pr-4 font-medium text-right">Consumo</th>
                <th className="pb-3 pr-4 font-medium text-right">Valor Consumo</th>
                <th className="pb-3 pr-4 font-medium text-right">Part. %</th>
                <th className="pb-3 pr-4 font-medium text-right">Días s/mov.</th>
                <th className="pb-3 pr-4 font-medium">Clase</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{i.nombre}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{i.codigo}</p>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.categoria}</td>
                  <td className="py-3 pr-4 text-right text-white">{i.stockTotal}</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(i.valorInventario)}</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{i.cantidadConsumida}</td>
                  <td className="py-3 pr-4 text-right text-white">{formatCurrency(i.valorConsumo)}</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{i.participacion}%</td>
                  <td className="py-3 pr-4 text-right text-muted-foreground">{i.diasSinMovimiento >= 9999 ? "nunca" : i.diasSinMovimiento}</td>
                  <td className="py-3 pr-4"><Badge variant={claseVariant(i.claseSugerida) as never} className="text-[10px]">{i.claseSugerida}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Sin datos</td></tr>)}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
