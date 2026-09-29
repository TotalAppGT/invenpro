"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  Search, FileText, Eye, ArrowLeftRight, Pencil, ChevronLeft, ChevronRight,
  Package, DollarSign, AlertTriangle, PackageX, BookOpen,
} from "lucide-react";

interface InvProducto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  costoUnit: number;
  precioUnit: number;
  stockMin: number;
  stockMax: number;
  codigoBarras: string | null;
  sku: string | null;
  categoria: { id: string; nombre: string };
  proveedor: { id: string; nombre: string } | null;
}

interface InventoryItem {
  id: string;
  bodegaId: string;
  bodega: { id: string; nombre: string };
  productoId: string;
  producto: InvProducto;
  cantidad: number;
  lote: string;
  fechaVencimiento: string | null;
  valorTotal: number;
  stockStatus: "normal" | "bajo" | "sin";
}

const estadoMap: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  normal: { label: "Normal", variant: "success" },
  bajo: { label: "Bajo", variant: "warning" },
  sin: { label: "Agotado", variant: "destructive" },
};

export default function InventarioPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [bodegaFilter, setBodegaFilter] = useState("TODAS");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustCantidad, setAdjustCantidad] = useState(0);
  const [adjustMotivo, setAdjustMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const perPage = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await api<InventoryItem[]>("/api/inventario?limit=100");
    if (res.success) setItems(res.data ?? []);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const bodegas = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => map.set(i.bodegaId, i.bodega.nombre));
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [items]);

  const categorias = useMemo(() => [...new Set(items.map((i) => i.producto.categoria?.nombre).filter(Boolean))].sort(), [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.producto.nombre.toLowerCase().includes(q) ||
        i.producto.codigo.toLowerCase().includes(q) ||
        i.lote.toLowerCase().includes(q) ||
        (i.producto.codigoBarras ?? "").toLowerCase().includes(q)
      );
    }
    if (bodegaFilter !== "TODAS") result = result.filter((i) => i.bodegaId === bodegaFilter);
    if (statusFilter !== "TODOS") result = result.filter((i) => i.stockStatus === statusFilter.toLowerCase());
    if (categoryFilter !== "TODAS") result = result.filter((i) => i.producto.categoria?.nombre === categoryFilter);
    return result;
  }, [items, search, bodegaFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    valorTotal: filtered.reduce((s, i) => s + i.valorTotal, 0),
    bajoStock: filtered.filter((i) => i.stockStatus === "bajo").length,
    sinStock: filtered.filter((i) => i.stockStatus === "sin").length,
  }), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((i) => i.id)));
  };

  const openAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustCantidad(item.cantidad);
    setAdjustMotivo("");
    setAdjustDialogOpen(true);
  };

  const confirmAdjust = async () => {
    if (!adjustItem) return;
    setSaving(true);
    const res = await api("/api/inventario/ajuste", {
      method: "POST",
      body: {
        productoId: adjustItem.productoId,
        bodegaId: adjustItem.bodegaId,
        cantidad: Number(adjustCantidad) || 0,
        costoUnit: adjustItem.producto.costoUnit,
        motivo: adjustMotivo || "Ajuste manual desde inventario",
      },
    });
    setSaving(false);
    if (res.success) {
      toast.success("Inventario ajustado");
      setAdjustDialogOpen(false);
      fetchItems();
    } else toast.error(res.error);
  };

  const exportCSV = () => {
    const header = "Codigo,Producto,Categoria,Bodega,Cantidad,Unidad,Costo,Precio,ValorTotal,StockMin,Estado,Lote,Vencimiento\n";
    const rows = filtered.map((i) => [
      i.producto.codigo, i.producto.nombre.replace(/,/g, " "), i.producto.categoria?.nombre ?? "",
      i.bodega.nombre, i.cantidad, i.producto.unidadMedida, Number(i.producto.costoUnit).toFixed(2),
      Number(i.producto.precioUnit).toFixed(2), i.valorTotal.toFixed(2), i.producto.stockMin,
      estadoMap[i.stockStatus].label, i.lote || "", i.fechaVencimiento ? formatDate(i.fechaVencimiento) : "",
    ].join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (loading) {
    return (<div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      <Skeleton className="h-96 rounded-xl" />
    </div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Inventario</h1>
          <p className="text-sm text-muted-foreground">Existencias por bodega, costo y valorización</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><FileText className="mr-1 h-3.5 w-3.5" />Exportar CSV</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info("Módulo de escaneo en /conteos")}><Search className="mr-1 h-3.5 w-3.5" />Escanear</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Items en Bodega", value: stats.total, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Valor Total", value: formatCurrency(stats.valorTotal), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Stock Bajo", value: stats.bajoStock, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Sin Stock", value: stats.sinStock, icon: PackageX, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código, producto, lote o código de barras..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <select value={bodegaFilter} onChange={(e) => { setBodegaFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las bodegas</option>
              {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODOS">Todos los estados</option>
              <option value="NORMAL">Normal</option>
              <option value="BAJO">Bajo Stock</option>
              <option value="SIN">Sin Stock</option>
            </select>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las categorías</option>
              {categorias.map((c) => <option key={c as string} value={c as string}>{c as string}</option>)}
            </select>
            {selectedIds.size > 0 && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toast.info("Selecciona una fila para ajustar")}><ArrowLeftRight className="mr-1 h-3.5 w-3.5" />Mover ({selectedIds.size})</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-2"><input type="checkbox" checked={selectedIds.size === paginated.length && paginated.length > 0} onChange={toggleSelectAll} className="rounded border-white/20 bg-transparent" /></th>
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="pb-3 pr-4 font-medium">Producto</th>
                  <th className="pb-3 pr-4 font-medium">Categoría</th>
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium text-right">Cantidad</th>
                  <th className="pb-3 pr-4 font-medium">Unidad</th>
                  <th className="pb-3 pr-4 font-medium text-right">Costo Unit</th>
                  <th className="pb-3 pr-4 font-medium text-right">Precio Unit</th>
                  <th className="pb-3 pr-4 font-medium text-right">Valor Total</th>
                  <th className="pb-3 pr-4 font-medium text-right">Stock Mín</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Lote</th>
                  <th className="pb-3 pr-4 font-medium">Vencimiento</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr key={item.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-2"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-white/20 bg-transparent" /></td>
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-400">{item.producto.codigo}</td>
                    <td className="py-3 pr-4 font-medium text-white">{item.producto.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.producto.categoria?.nombre ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.bodega.nombre}</td>
                    <td className="py-3 pr-4 text-right text-white">{item.cantidad}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.producto.unidadMedida}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(item.producto.costoUnit)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(item.producto.precioUnit)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(item.valorTotal)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{item.producto.stockMin}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={estadoMap[item.stockStatus].variant} className="text-[10px]">{estadoMap[item.stockStatus].label}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{item.lote || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.fechaVencimiento ? formatDate(item.fechaVencimiento) : "N/A"}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver producto" onClick={() => setDetailItem(item)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ajustar stock" onClick={() => openAdjust(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={15} className="py-12 text-center text-muted-foreground">No hay existencias registradas. Crea productos y registra entradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length} items</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle del producto */}
      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{detailItem?.producto.nombre}</DialogTitle>
            <DialogDescription className="font-mono text-xs">{detailItem?.producto.codigo} · {detailItem?.producto.categoria?.nombre}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info label="Bodega" value={detailItem.bodega.nombre} />
                <Info label="Unidad" value={detailItem.producto.unidadMedida} />
                <Info label="Existencia" value={`${detailItem.cantidad} ${detailItem.producto.unidadMedida}`} />
                <Info label="Lote" value={detailItem.lote || "—"} />
                <Info label="Costo unitario" value={formatCurrency(detailItem.producto.costoUnit)} />
                <Info label="Precio unitario" value={formatCurrency(detailItem.producto.precioUnit)} />
                <Info label="Valor en bodega" value={formatCurrency(detailItem.valorTotal)} />
                <Info label="Stock mín / máx" value={`${detailItem.producto.stockMin} / ${detailItem.producto.stockMax}`} />
                <Info label="Código de barras" value={detailItem.producto.codigoBarras || "—"} />
                <Info label="SKU" value={detailItem.producto.sku || "—"} />
                <Info label="Vencimiento" value={detailItem.fechaVencimiento ? formatDate(detailItem.fechaVencimiento) : "N/A"} />
                <Info label="Proveedor" value={detailItem.producto.proveedor?.nombre || "—"} />
              </div>
              {detailItem.producto.descripcion && (
                <div className="rounded-lg bg-white/[0.02] p-3 text-xs text-muted-foreground">{detailItem.producto.descripcion}</div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailItem(null)}>Cerrar</Button>
            <a href={`/kardex`} className="inline-flex">
              <Button variant="outline"><BookOpen className="mr-1 h-4 w-4" />Ver Kardex</Button>
            </a>
            <a href={`/productos`} className="inline-flex">
              <Button><Pencil className="mr-1 h-4 w-4" />Editar Producto</Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajuste de stock */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ajustar Stock</DialogTitle>
            <DialogDescription>
              {adjustItem?.producto.nombre} — actual: {adjustItem?.cantidad} {adjustItem?.producto.unidadMedida}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Cantidad final en bodega</Label>
              <Input type="number" value={adjustCantidad} onChange={(e) => setAdjustCantidad(Number(e.target.value))} className="text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Motivo</Label>
              <Input value={adjustMotivo} onChange={(e) => setAdjustMotivo(e.target.value)} placeholder="Merma, conteo físico, corrección..." className="text-white" />
            </div>
            <div className="rounded-lg bg-white/[0.02] p-3 text-xs text-muted-foreground">
              Diferencia: <span className={cn("font-semibold", (adjustCantidad - (adjustItem?.cantidad ?? 0)) === 0 ? "text-white" : "text-amber-400")}>
                {(adjustCantidad - (adjustItem?.cantidad ?? 0)) > 0 ? "+" : ""}{adjustCantidad - (adjustItem?.cantidad ?? 0)}
              </span> unidades
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAdjust} loading={saving}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.02] p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
