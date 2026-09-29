"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, ShoppingCart, AlertTriangle, DollarSign } from "lucide-react";

interface Sugerencia {
  producto: { id: string; codigo: string; nombre: string; unidadMedida: string; costoUnit: number };
  proveedor: { id: string; nombre: string } | null;
  stockTotal: number;
  puntoReorden: number;
  consumoDiario: number;
  demandaLeadTime: number;
  cantidadSugerida: number;
  diasCobertura: number | null;
  requiereCompra: boolean;
  clasificacion: string | null;
  costoEstimado: number;
}
interface Bodega { id: string; nombre: string; }

export default function ComprasSugeridasPage() {
  const [loading, setLoading] = useState(true);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [meta, setMeta] = useState<{ urgentes: number; totalEstimado: number }>({ urgentes: 0, totalEstimado: 0 });
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [search, setSearch] = useState("");
  const [soloUrgentes, setSoloUrgentes] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [s, b] = await Promise.all([
      api<Sugerencia[]>(`/api/compras-sugeridas${bodegaFiltro !== "todas" ? `?bodegaId=${bodegaFiltro}` : ""}`),
      api<Bodega[]>("/api/bodegas"),
    ]);
    if (s.success) {
      setSugerencias(s.data ?? []);
      const m = (s.meta ?? {}) as { urgentes?: number; totalEstimado?: number };
      setMeta({ urgentes: m.urgentes ?? 0, totalEstimado: m.totalEstimado ?? 0 });
    } else toast.error(s.error);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, [bodegaFiltro]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sugerencias.filter((s) => {
      const mQ = !q || s.producto.nombre.toLowerCase().includes(q) || s.producto.codigo.toLowerCase().includes(q);
      const mU = !soloUrgentes || s.requiereCompra;
      return mQ && mU;
    });
  }, [sugerencias, search, soloUrgentes]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Compras Sugeridas</h1>
        <p className="text-sm text-muted-foreground">Reposición automática según punto de reorden, lead time y consumo</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Productos a Revisar", value: sugerencias.length, icon: ShoppingCart, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Urgentes", value: meta.urgentes, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Inversión Estimada", value: formatCurrency(meta.totalEstimado), icon: DollarSign, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={bodegaFiltro} onValueChange={setBodegaFiltro}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las bodegas</SelectItem>
            {bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={soloUrgentes ? "default" : "outline"} onClick={() => setSoloUrgentes((v) => !v)}>Solo urgentes</Button>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Producto</th>
                  <th className="pb-3 pr-4 font-medium">Proveedor</th>
                  <th className="pb-3 pr-4 font-medium text-right">Stock</th>
                  <th className="pb-3 pr-4 font-medium text-right">Reorden</th>
                  <th className="pb-3 pr-4 font-medium text-right">Consumo/día</th>
                  <th className="pb-3 pr-4 font-medium text-right">Cobertura</th>
                  <th className="pb-3 pr-4 font-medium text-right">Sugerido</th>
                  <th className="pb-3 pr-4 font-medium text-right">Costo Est.</th>
                  <th className="pb-3 pr-4 font-medium">Prioridad</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.producto.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{s.producto.nombre}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{s.producto.codigo}</p>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.proveedor?.nombre || "—"}</td>
                    <td className="py-3 pr-4 text-right text-white">{s.stockTotal}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{s.puntoReorden}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{s.consumoDiario}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{s.diasCobertura !== null ? `${s.diasCobertura}d` : "—"}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-indigo-300">{s.cantidadSugerida}</td>
                    <td className="py-3 pr-4 text-right text-white">{formatCurrency(s.costoEstimado)}</td>
                    <td className="py-3 pr-4">
                      {s.requiereCompra
                        ? <Badge variant="destructive" className="text-[10px]">Comprar</Badge>
                        : <Badge variant="default" className="text-[10px]">OK</Badge>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Sin sugerencias. Configura punto de reorden o stock mínimo en tus productos.</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
