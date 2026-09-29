"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Search, Plus, FileText, Eye, ChevronLeft, ChevronRight, X } from "lucide-react";

interface MovimientoItem {
  id: string;
  tipo: string;
  fecha: string;
  cantidad: number;
  cantAnterior: number;
  cantNueva: number;
  costoUnit: number;
  total: number;
  producto: { id: string; codigo: string; nombre: string } | null;
  bodega: { id: string; nombre: string } | null;
  bodegaDestino: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string; email: string } | null;
  notas: string | null;
  referencia: string | null;
  documento: string | null;
}

interface ProductoOption { id: string; codigo: string; nombre: string; costoUnit: number; }
interface BodegaOption { id: string; nombre: string; }

const tipoBadge: Record<string, "success" | "destructive" | "warning" | "default"> = {
  ENTRADA: "success", SALIDA: "destructive", AJUSTE: "warning", TRASLADO: "default", CONTEO_DIFERENCIA: "warning",
};
const tipoLabel: Record<string, string> = {
  ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste", TRASLADO: "Traslado", CONTEO_DIFERENCIA: "Conteo",
};
const datePresets = [
  { label: "Hoy", days: 0 }, { label: "7 días", days: 7 }, { label: "30 días", days: 30 },
];

const emptyForm = {
  tipo: "ENTRADA", productoId: "", bodegaId: "", bodegaDestinoId: "", cantidad: 1,
  costoUnit: 0, notas: "", referencia: "", documento: "",
};

export default function MovimientosPage() {
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterBodega, setFilterBodega] = useState("TODAS");
  const [datePreset, setDatePreset] = useState("TODOS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMov, setSelectedMov] = useState<MovimientoItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const perPage = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [m, p, b] = await Promise.all([
      api<MovimientoItem[]>("/api/movimientos?limit=100"),
      api<ProductoOption[]>("/api/productos?limit=200"),
      api<BodegaOption[]>("/api/bodegas?limit=100"),
    ]);
    if (m.success) setMovimientos(m.data ?? []); else toast.error(m.error);
    if (p.success) setProductos(p.data ?? []);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = [...movimientos];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        (m.producto?.nombre ?? "").toLowerCase().includes(q) ||
        (m.producto?.codigo ?? "").toLowerCase().includes(q) ||
        (m.documento ?? "").toLowerCase().includes(q) ||
        (m.referencia ?? "").toLowerCase().includes(q)
      );
    }
    if (filterTipo !== "TODOS") result = result.filter((m) => m.tipo === filterTipo);
    if (filterBodega !== "TODAS") result = result.filter((m) => m.bodega?.id === filterBodega);
    if (datePreset !== "TODOS") {
      const days = parseInt(datePreset, 10);
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter((m) => new Date(m.fecha) >= cutoff);
    }
    if (dateFrom) result = result.filter((m) => new Date(m.fecha) >= new Date(dateFrom));
    if (dateTo) result = result.filter((m) => new Date(m.fecha) <= new Date(dateTo + "T23:59:59"));
    return result;
  }, [movimientos, search, filterTipo, filterBodega, datePreset, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openNew = () => {
    setForm({
      ...emptyForm,
      productoId: productos[0]?.id ?? "",
      bodegaId: bodegas[0]?.id ?? "",
      costoUnit: productos[0]?.costoUnit ?? 0,
    });
    setDialogOpen(true);
  };

  const handleProductoChange = (id: string) => {
    const prod = productos.find((p) => p.id === id);
    setForm((prev) => ({ ...prev, productoId: id, costoUnit: prod?.costoUnit ?? prev.costoUnit }));
  };

  const handleSave = async () => {
    if (!form.productoId || !form.bodegaId || form.cantidad <= 0) {
      toast.error("Producto, bodega y cantidad son obligatorios");
      return;
    }
    if (form.tipo === "TRASLADO" && (!form.bodegaDestinoId || form.bodegaDestinoId === form.bodegaId)) {
      toast.error("Selecciona una bodega destino diferente");
      return;
    }
    setSaving(true);
    const res = await api("/api/movimientos", {
      method: "POST",
      body: {
        tipo: form.tipo,
        productoId: form.productoId,
        bodegaId: form.bodegaId,
        bodegaDestinoId: form.tipo === "TRASLADO" ? form.bodegaDestinoId : null,
        cantidad: Number(form.cantidad),
        costoUnit: Number(form.costoUnit) || 0,
        notas: form.notas || null,
        referencia: form.referencia || null,
        documento: form.documento || null,
      },
    });
    setSaving(false);
    if (res.success) {
      toast.success("Movimiento registrado");
      setDialogOpen(false);
      fetchData();
    } else toast.error(res.error);
  };

  const exportCSV = () => {
    const header = "Fecha,Tipo,Producto,Bodega,Destino,Cantidad,Costo,Total,Usuario,Documento,Notas\n";
    const rows = filtered.map((m) => [
      formatDateTime(m.fecha), tipoLabel[m.tipo] || m.tipo,
      (m.producto?.nombre ?? "").replace(/,/g, " "), m.bodega?.nombre ?? "", m.bodegaDestino?.nombre ?? "",
      m.cantidad, m.costoUnit.toFixed(2), m.total.toFixed(2), m.usuario?.nombre ?? "",
      m.documento ?? "", (m.notas ?? "").replace(/,/g, " "),
    ].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  const clearFilters = () => {
    setSearch(""); setFilterTipo("TODOS"); setFilterBodega("TODAS");
    setDatePreset("TODOS"); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const hasFilters = search || filterTipo !== "TODOS" || filterBodega !== "TODAS" || datePreset !== "TODOS" || dateFrom || dateTo;

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Movimientos</h1>
          <p className="text-sm text-muted-foreground">Registro de entradas, salidas, ajustes y traslados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><FileText className="mr-1 h-3.5 w-3.5" />CSV</Button>
          <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nuevo Movimiento</Button>
        </div>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar producto, código o documento..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODOS">Todos los tipos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SALIDA">Salida</option>
              <option value="AJUSTE">Ajuste</option>
              <option value="TRASLADO">Traslado</option>
            </select>
            <select value={filterBodega} onChange={(e) => { setFilterBodega(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las bodegas</option>
              {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-[#0f0f2e] p-1">
              {datePresets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setDatePreset(String(p.days)); setDateFrom(""); setDateTo(""); setPage(1); }}
                  className={cn("rounded-md px-2.5 py-1 text-xs", datePreset === String(p.days) ? "bg-indigo-500/20 text-white" : "text-muted-foreground hover:text-white")}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Input type="date" value={dateFrom} onChange={(e) => { setDatePreset("TODOS"); setDateFrom(e.target.value); setPage(1); }} className="w-36 text-xs" />
            <span className="text-muted-foreground">-</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDatePreset("TODOS"); setDateTo(e.target.value); setPage(1); }} className="w-36 text-xs" />
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-3.5 w-3.5" />Limpiar</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Producto</th>
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium text-right">Cantidad</th>
                  <th className="pb-3 pr-4 font-medium text-right">Stock Ant. → Nuevo</th>
                  <th className="pb-3 pr-4 font-medium">Usuario</th>
                  <th className="pb-3 pr-4 font-medium">Documento</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => (
                  <tr key={m.id} className="cursor-pointer border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]" onClick={() => { setSelectedMov(m); setDetailDialogOpen(true); }}>
                    <td className="py-3 pr-4 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDateTime(m.fecha)}</td>
                    <td className="py-3 pr-4"><Badge variant={tipoBadge[m.tipo] || "default"} className="text-[10px]">{tipoLabel[m.tipo] || m.tipo}</Badge></td>
                    <td className="py-3 pr-4 font-medium text-white">{m.producto?.nombre ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.bodega?.nombre ?? "—"}{m.bodegaDestino ? ` → ${m.bodegaDestino.nombre}` : ""}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{m.cantidad}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{m.cantAnterior} → {m.cantNueva}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.usuario?.nombre ?? "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-400">{m.documento || "—"}</td>
                    <td className="py-3 pr-4 text-right"><Eye className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></td>
                  </tr>
                ))}
                {paginated.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No se encontraron movimientos</td></tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo Movimiento</DialogTitle>
            <DialogDescription>Registrar entrada, salida, ajuste o traslado</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Tipo de Movimiento</Label>
              <div className="flex gap-2">
                {["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm({ ...form, tipo: t, bodegaDestinoId: t !== "TRASLADO" ? "" : form.bodegaDestinoId })}
                    className={cn("flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      form.tipo === t
                        ? t === "ENTRADA" ? "bg-emerald-500/20 text-emerald-400" : t === "SALIDA" ? "bg-red-500/20 text-red-400" : t === "AJUSTE" ? "bg-amber-500/20 text-amber-400" : "bg-indigo-500/20 text-indigo-400"
                        : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.05]"
                    )}
                  >
                    {tipoLabel[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Producto *</Label>
              <Select value={form.productoId} onValueChange={handleProductoChange}>
                <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                <SelectContent>
                  {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Bodega *</Label>
              <Select value={form.bodegaId} onValueChange={(v) => setForm({ ...form, bodegaId: v })}>
                <SelectTrigger><SelectValue placeholder="Bodega" /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.tipo === "TRASLADO" ? (
              <div className="space-y-2">
                <Label className="text-white">Bodega Destino *</Label>
                <Select value={form.bodegaDestinoId} onValueChange={(v) => setForm({ ...form, bodegaDestinoId: v })}>
                  <SelectTrigger><SelectValue placeholder="Destino" /></SelectTrigger>
                  <SelectContent>{bodegas.filter((b) => b.id !== form.bodegaId).map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-white">Costo Unitario</Label>
                <Input type="number" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: Number(e.target.value) })} />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-white">{form.tipo === "AJUSTE" ? "Cantidad final *" : "Cantidad *"}</Label>
              <Input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="N° de documento" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Referencia</Label>
              <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Referencia" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Notas</Label>
              <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas del movimiento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.productoId || !form.bodegaId || form.cantidad <= 0}>Registrar Movimiento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Detalle del Movimiento</DialogTitle></DialogHeader>
          {selectedMov && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailBox label="Tipo"><Badge variant={tipoBadge[selectedMov.tipo] || "default"}>{tipoLabel[selectedMov.tipo] || selectedMov.tipo}</Badge></DetailBox>
                <DetailBox label="Fecha">{formatDateTime(selectedMov.fecha)}</DetailBox>
                <DetailBox label="Producto">{selectedMov.producto?.nombre ?? "—"}</DetailBox>
                <DetailBox label="Código">{selectedMov.producto?.codigo ?? "—"}</DetailBox>
                <DetailBox label="Bodega">{selectedMov.bodega?.nombre ?? "—"}</DetailBox>
                <DetailBox label="Cantidad">{selectedMov.cantidad}</DetailBox>
                <DetailBox label="Stock Anterior → Nuevo">{selectedMov.cantAnterior} → {selectedMov.cantNueva}</DetailBox>
                <DetailBox label="Costo Unit.">{formatCurrency(selectedMov.costoUnit)}</DetailBox>
                <DetailBox label="Total">{formatCurrency(selectedMov.total)}</DetailBox>
                <DetailBox label="Usuario">{selectedMov.usuario?.nombre ?? "—"}</DetailBox>
                {selectedMov.bodegaDestino && (<div className="col-span-2"><DetailBox label="Bodega Destino">{selectedMov.bodegaDestino.nombre}</DetailBox></div>)}
                <DetailBox label="Documento">{selectedMov.documento || "N/A"}</DetailBox>
                <DetailBox label="Referencia">{selectedMov.referencia || "N/A"}</DetailBox>
                {selectedMov.notas && (<div className="col-span-2"><DetailBox label="Notas">{selectedMov.notas}</DetailBox></div>)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white/[0.02] p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-white">{children}</div>
    </div>
  );
}
