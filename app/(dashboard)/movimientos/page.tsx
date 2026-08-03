"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import {
  Search, Plus, Download, FileText, ArrowLeftRight, Eye, ChevronLeft, ChevronRight, Calendar, Filter, X,
} from "lucide-react";

interface MovimientoItem {
  id: string;
  fecha: string;
  tipo: string;
  bodega: string;
  bodegaDestino: string | null;
  producto: string;
  cantidad: number;
  cantAnterior: number;
  cantNueva: number;
  usuario: string;
  notas: string | null;
  documento: string | null;
}

interface MovimientoFormData {
  tipo: string;
  bodega: string;
  bodegaDestino: string;
  producto: string;
  cantidad: number;
  notas: string;
  referencia: string;
  documento: string;
}

const tipoBadge: Record<string, "success" | "destructive" | "warning" | "default"> = {
  ENTRADA: "success", SALIDA: "destructive", AJUSTE: "warning", TRASLADO: "default",
};
const tipoLabel: Record<string, string> = {
  ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste", TRASLADO: "Traslado",
};
const datePresets = [
  { label: "Hoy", days: 0 }, { label: "Esta semana", days: 7 }, { label: "Este mes", days: 30 },
];

export default function MovimientosPage() {
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<MovimientoItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [filterBodega, setFilterBodega] = useState("TODAS");
  const [filterUsuario, setFilterUsuario] = useState("");
  const [datePreset, setDatePreset] = useState("TODOS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMov, setSelectedMov] = useState<MovimientoItem | null>(null);
  const [form, setForm] = useState<MovimientoFormData>({
    tipo: "ENTRADA", bodega: "Bodega Central", bodegaDestino: "",
    producto: "", cantidad: 1, notas: "", referencia: "", documento: "",
  });
  const perPage = 15;

  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const bodegas = ["Bodega Central", "Bodega Norte", "Bodega Sur", "Bodega Este"];
    const productos = ["Tornillo 3/4\"", "Cemento Portland", "Laptop HP", "Papel Bond A4", "Martillo 16oz", "Pintura Blanca", "Mouse", "Destornillador"];
    const usuarios = ["Juan Pérez", "María García", "Carlos López"];
    const tipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"] as const;
    const mock: MovimientoItem[] = Array.from({ length: 78 }, (_, i) => {
      const tipo = tipos[i % 4];
      const cant = Math.floor(Math.random() * 100) + 1;
      return {
        id: `mov-${i + 1}`,
        fecha: new Date(Date.now() - i * 7200000).toISOString(),
        tipo,
        bodega: bodegas[i % 4],
        bodegaDestino: tipo === "TRASLADO" ? bodegas[(i + 2) % 4] : null,
        producto: productos[i % 8],
        cantidad: cant,
        cantAnterior: cant + Math.floor(Math.random() * 30),
        cantNueva: cant,
        usuario: usuarios[i % 3],
        notas: i % 3 === 0 ? `Nota de movimiento #${i + 1}` : null,
        documento: i % 4 === 0 ? `DOC-${String(i + 1).padStart(3, "0")}` : null,
      };
    });
    setMovimientos(mock);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMovimientos(); }, [fetchMovimientos]);

  const bodegas = useMemo(() => [...new Set(movimientos.map((m) => m.bodega))].sort(), [movimientos]);

  const filtered = useMemo(() => {
    let result = [...movimientos];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.producto.toLowerCase().includes(q) || (m.documento && m.documento.toLowerCase().includes(q)));
    }
    if (filterTipo !== "TODOS") result = result.filter((m) => m.tipo === filterTipo);
    if (filterBodega !== "TODAS") result = result.filter((m) => m.bodega === filterBodega);
    if (filterUsuario) result = result.filter((m) => m.usuario.toLowerCase().includes(filterUsuario.toLowerCase()));
    if (datePreset !== "TODOS") {
      const days = parseInt(datePreset);
      const cutoff = new Date(Date.now() - days * 86400000);
      result = result.filter((m) => new Date(m.fecha) >= cutoff);
    }
    if (dateFrom) result = result.filter((m) => new Date(m.fecha) >= new Date(dateFrom));
    if (dateTo) result = result.filter((m) => new Date(m.fecha) <= new Date(dateTo + "T23:59:59"));
    return result;
  }, [movimientos, search, filterTipo, filterBodega, filterUsuario, datePreset, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openNew = () => {
    setForm({ tipo: "ENTRADA", bodega: bodegas[0] || "", bodegaDestino: "", producto: "", cantidad: 1, notas: "", referencia: "", documento: "" });
    setDialogOpen(true);
  };

  const openDetail = (m: MovimientoItem) => { setSelectedMov(m); setDetailDialogOpen(true); };

  const handleSave = () => {
    if (!form.producto || form.cantidad <= 0) { toast.error("Complete todos los campos"); return; }
    if (form.tipo === "SALIDA") toast.info("Validando stock disponible...");
    const newMov: MovimientoItem = {
      id: `mov-${Date.now()}`, fecha: new Date().toISOString(), tipo: form.tipo,
      bodega: form.bodega, bodegaDestino: form.tipo === "TRASLADO" ? form.bodegaDestino : null,
      producto: form.producto, cantidad: form.cantidad, cantAnterior: form.cantidad + 10,
      cantNueva: form.cantidad, usuario: "Usuario Actual", notas: form.notas || null,
      documento: form.documento || null,
    };
    setMovimientos((prev) => [newMov, ...prev]);
    toast.success(`Movimiento de ${tipoLabel[form.tipo]} registrado`);
    setDialogOpen(false);
  };

  const handleExportPDF = () => toast.success("Exportando a PDF...");
  const handleExportExcel = () => toast.success("Exportando a Excel...");

  const clearFilters = () => {
    setSearch(""); setFilterTipo("TODOS"); setFilterBodega("TODAS");
    setFilterUsuario(""); setDatePreset("TODOS"); setDateFrom(""); setDateTo(""); setPage(1);
  };

  const hasFilters = search || filterTipo !== "TODOS" || filterBodega !== "TODAS" || filterUsuario || datePreset !== "TODOS" || dateFrom || dateTo;

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Movimientos</h1>
          <p className="text-sm text-muted-foreground">Registro de entradas, salidas y ajustes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="mr-1 h-3.5 w-3.5" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="mr-1 h-3.5 w-3.5" />Excel</Button>
        </div>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar producto o documento..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
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
              {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <Input placeholder="Filtrar usuario..." value={filterUsuario} onChange={(e) => { setFilterUsuario(e.target.value); setPage(1); }} className="w-36" />
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
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium">Producto</th>
                  <th className="pb-3 pr-4 font-medium text-right">Cantidad</th>
                  <th className="pb-3 pr-4 font-medium">Usuario</th>
                  <th className="pb-3 pr-4 font-medium">Notas</th>
                  <th className="pb-3 pr-4 font-medium">Documento</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m) => (
                  <tr key={m.id} className="cursor-pointer border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]" onClick={() => openDetail(m)}>
                    <td className="py-3 pr-4 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDateTime(m.fecha)}</td>
                    <td className="py-3 pr-4"><Badge variant={tipoBadge[m.tipo] || "default"} className="text-[10px]">{tipoLabel[m.tipo] || m.tipo}</Badge></td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.bodega}</td>
                    <td className="py-3 pr-4 font-medium text-white">{m.producto}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{m.cantidad}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.usuario}</td>
                    <td className="py-3 pr-4 max-w-[150px] truncate text-muted-foreground">{m.notas || "—"}</td>
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

      <Button size="sm" className="fixed bottom-6 right-6 z-50 shadow-lg shadow-indigo-500/30" onClick={openNew}>
        <Plus className="mr-1 h-4 w-4" />Nuevo Movimiento
      </Button>

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
                    onClick={() => setForm({ ...form, tipo: t, bodegaDestino: t !== "TRASLADO" ? "" : form.bodegaDestino })}
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
            <div className="space-y-2">
              <Label className="text-white">Bodega</Label>
              <select value={form.bodega} onChange={(e) => setForm({ ...form, bodega: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {form.tipo === "TRASLADO" && (
              <div className="space-y-2">
                <Label className="text-white">Bodega Destino</Label>
                <select value={form.bodegaDestino} onChange={(e) => setForm({ ...form, bodegaDestino: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                  {bodegas.filter((b) => b !== form.bodega).map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
            <div className={form.tipo === "TRASLADO" ? "col-span-2 space-y-2" : "space-y-2"}>
              <Label className="text-white">Producto</Label>
              <Input value={form.producto} onChange={(e) => setForm({ ...form, producto: e.target.value })} placeholder="Buscar producto..." />
            </div>
            <div className={form.tipo === "TRASLADO" ? "space-y-2" : "space-y-2"}>
              <Label className="text-white">Cantidad</Label>
              <Input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: Number(e.target.value) })} />
            </div>
            <div className={form.tipo === "TRASLADO" ? "col-span-2 space-y-2" : "space-y-2"}>
              <Label className="text-white">Notas</Label>
              <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas del movimiento" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Referencia</Label>
              <Input value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} placeholder="Referencia" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Documento</Label>
              <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="N° de documento" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.producto || form.cantidad <= 0}>Registrar Movimiento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Detalle del Movimiento</DialogTitle>
          </DialogHeader>
          {selectedMov && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge variant={tipoBadge[selectedMov.tipo] || "default"} className="mt-1">{tipoLabel[selectedMov.tipo]}</Badge>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Fecha</p>
                  <p className="mt-1 text-sm font-medium text-white">{formatDateTime(selectedMov.fecha)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Producto</p>
                  <p className="mt-1 text-sm font-medium text-white">{selectedMov.producto}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Bodega</p>
                  <p className="mt-1 text-sm font-medium text-white">{selectedMov.bodega}</p>
                </div>
                {selectedMov.bodegaDestino && (
                  <div className="col-span-2 rounded-lg bg-white/[0.02] p-3">
                    <p className="text-xs text-muted-foreground">Bodega Destino</p>
                    <p className="mt-1 text-sm font-medium text-white">{selectedMov.bodegaDestino}</p>
                  </div>
                )}
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Cantidad</p>
                  <p className="mt-1 text-sm font-bold text-white">{selectedMov.cantidad}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Stock Anterior → Nuevo</p>
                  <p className="mt-1 text-sm text-white">{selectedMov.cantAnterior} → {selectedMov.cantNueva}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Usuario</p>
                  <p className="mt-1 text-sm text-white">{selectedMov.usuario}</p>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-3">
                  <p className="text-xs text-muted-foreground">Documento</p>
                  <p className="mt-1 text-sm text-white">{selectedMov.documento || "N/A"}</p>
                </div>
                {selectedMov.notas && (
                  <div className="col-span-2 rounded-lg bg-white/[0.02] p-3">
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="mt-1 text-sm text-white">{selectedMov.notas}</p>
                  </div>
                )}
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
