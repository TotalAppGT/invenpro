"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Search, Plus, Trash2, Hash, CheckCircle, PackageX } from "lucide-react";

interface Serie {
  id: string;
  serie: string;
  estado: string;
  lote: string | null;
  costoUnit: number | null;
  producto: { id: string; codigo: string; nombre: string };
  bodega: { id: string; nombre: string };
  ubicacion: { id: string; codigo: string; nombre: string } | null;
}
interface Producto { id: string; codigo: string; nombre: string; }
interface Bodega { id: string; nombre: string; }

const ESTADOS = ["DISPONIBLE", "RESERVADO", "VENDIDO", "BAJA"] as const;
const estadoVariant = (e: string) => e === "DISPONIBLE" ? "success" : e === "VENDIDO" ? "default" : e === "BAJA" ? "destructive" : "warning";

export default function SeriesPage() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<Serie[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ serie: "", productoId: "", bodegaId: "", estado: "DISPONIBLE", lote: "", costoUnit: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [s, p, b] = await Promise.all([
      api<Serie[]>("/api/numeros-serie?limit=100"),
      api<Producto[]>("/api/productos?limit=100"),
      api<Bodega[]>("/api/bodegas"),
    ]);
    if (s.success) setSeries(s.data ?? []);
    if (p.success) setProductos(p.data ?? []);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return series.filter((s) => {
      const mQ = !q || s.serie.toLowerCase().includes(q) || s.producto?.nombre.toLowerCase().includes(q);
      const mE = estadoFiltro === "todos" || s.estado === estadoFiltro;
      return mQ && mE;
    });
  }, [series, search, estadoFiltro]);

  const openNew = () => {
    setForm({ serie: "", productoId: productos[0]?.id ?? "", bodegaId: bodegas[0]?.id ?? "", estado: "DISPONIBLE", lote: "", costoUnit: 0 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.serie || !form.productoId || !form.bodegaId) { toast.error("Serie, producto y bodega son obligatorios"); return; }
    setSaving(true);
    const res = await api("/api/numeros-serie", { method: "POST", body: { ...form, costoUnit: Number(form.costoUnit) || null } });
    setSaving(false);
    if (res.success) { toast.success("Serie registrada"); setDialogOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const handleDelete = async (s: Serie) => {
    if (!confirm(`¿Eliminar la serie ${s.serie}?`)) return;
    const res = await api(`/api/numeros-serie/${s.id}`, { method: "DELETE" });
    if (res.success) { toast.success("Serie eliminada"); fetchData(); } else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: series.length,
    disponibles: series.filter((s) => s.estado === "DISPONIBLE").length,
    vendidos: series.filter((s) => s.estado === "VENDIDO").length,
  }), [series]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Números de Serie</h1>
          <p className="text-sm text-muted-foreground">Trazabilidad individual por unidad (series)</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Registrar Serie</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Series", value: stats.total, icon: Hash, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Disponibles", value: stats.disponibles, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Vendidos", value: stats.vendidos, icon: PackageX, color: "text-indigo-400", bg: "bg-indigo-500/10" },
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
          <Input placeholder="Buscar serie o producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Serie</th>
                  <th className="pb-3 pr-4 font-medium">Producto</th>
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium">Ubicación</th>
                  <th className="pb-3 pr-4 font-medium">Lote</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{s.serie}</td>
                    <td className="py-3 pr-4 text-white">{s.producto?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.bodega?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.ubicacion?.codigo || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.lote || "—"}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(s.estado) as never} className="text-[10px]">{s.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(s)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay números de serie registrados</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Número de Serie</DialogTitle>
            <DialogDescription>Trazabilidad individual de una unidad</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-white">Serie *</Label><Input value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} placeholder="SN-000123" /></div>
            <div className="space-y-2">
              <Label className="text-white">Producto *</Label>
              <Select value={form.productoId} onValueChange={(v) => setForm({ ...form, productoId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Bodega *</Label>
              <Select value={form.bodegaId} onValueChange={(v) => setForm({ ...form, bodegaId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-white">Lote</Label><Input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} /></div>
              <div className="space-y-2"><Label className="text-white">Costo</Label><Input type="number" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
