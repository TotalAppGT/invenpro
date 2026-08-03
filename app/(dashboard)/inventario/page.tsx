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
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  FileText,
  Eye,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Scan,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  AlertTriangle,
  PackageX,
  CheckCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventoryItem {
  id: string;
  codigo: string;
  producto: string;
  categoria: string;
  bodega: string;
  cantidad: number;
  unidad: string;
  costoUnit: number;
  precioUnit: number;
  valorTotal: number;
  stockMin: number;
  estado: "NORMAL" | "BAJO" | "AGOTADO";
  lote: string;
  vencimiento: string | null;
}

const estadoVariant: Record<string, "success" | "warning" | "destructive"> = {
  NORMAL: "success", BAJO: "warning", AGOTADO: "destructive",
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
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustCantidad, setAdjustCantidad] = useState(0);
  const perPage = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const mock: InventoryItem[] = Array.from({ length: 67 }, (_, i) => {
      const categorias = ["Ferretería", "Electrónicos", "Construcción", "Papelería", "Pintura", "Plomería"];
      const bodegas = ["Bodega Central", "Bodega Norte", "Bodega Sur", "Bodega Este"];
      const prodNames = ["Tornillo 3/4\"", "Cemento Portland", "Laptop HP", "Papel Bond A4", "Martillo 16oz", "Pintura Blanca", "Mouse Inalámbrico", "Destornillador", "Cable HDMI", "Clavos 2\""];
      const cantidad = i % 3 === 0 ? 0 : i % 5 === 0 ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 200) + 10;
      const min = Math.floor(Math.random() * 10) + 5;
      let estado: "NORMAL" | "BAJO" | "AGOTADO" = "NORMAL";
      if (cantidad === 0) estado = "AGOTADO";
      else if (cantidad <= min) estado = "BAJO";
      const costo = Math.round((Math.random() * 500 + 10) * 100) / 100;
      const precio = Math.round(costo * (1 + Math.random() * 0.5) * 100) / 100;
      return {
        id: `inv-${i + 1}`,
        codigo: `PRD-${String(i + 1).padStart(4, "0")}`,
        producto: prodNames[i % prodNames.length],
        categoria: categorias[i % categorias.length],
        bodega: bodegas[i % bodegas.length],
        cantidad,
        unidad: "UNIDAD",
        costoUnit: costo,
        precioUnit: precio,
        valorTotal: Math.round(cantidad * costo * 100) / 100,
        stockMin: min,
        estado,
        lote: `L${String(i + 1).padStart(3, "0")}`,
        vencimiento: i % 4 === 0 ? new Date(Date.now() + (Math.random() * 365 * 86400000)).toISOString() : null,
      };
    });
    setItems(mock);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const bodegas = useMemo(() => [...new Set(items.map((i) => i.bodega))].sort(), [items]);
  const categorias = useMemo(() => [...new Set(items.map((i) => i.categoria))].sort(), [items]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.producto.toLowerCase().includes(q) || i.codigo.toLowerCase().includes(q) || i.lote.toLowerCase().includes(q));
    }
    if (bodegaFilter !== "TODAS") result = result.filter((i) => i.bodega === bodegaFilter);
    if (statusFilter !== "TODOS") {
      result = result.filter((i) => statusFilter === "BAJO" ? i.estado === "BAJO" : statusFilter === "AGOTADO" ? i.estado === "AGOTADO" : i.estado === "NORMAL");
    }
    if (categoryFilter !== "TODAS") result = result.filter((i) => i.categoria === categoryFilter);
    return result;
  }, [items, search, bodegaFilter, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    valorTotal: filtered.reduce((s, i) => s + i.valorTotal, 0),
    bajoStock: filtered.filter((i) => i.estado === "BAJO").length,
    sinStock: filtered.filter((i) => i.estado === "AGOTADO").length,
  }), [filtered]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((i) => i.id)));
    }
  };

  const handleAdjust = (item: InventoryItem) => {
    setAdjustItem(item);
    setAdjustCantidad(0);
    setAdjustDialogOpen(true);
  };

  const confirmAdjust = () => {
    if (adjustItem) {
      setItems((prev) => prev.map((i) => i.id === adjustItem.id ? { ...i, cantidad: i.cantidad + adjustCantidad, valorTotal: (i.cantidad + adjustCantidad) * i.costoUnit, estado: ((i.cantidad + adjustCantidad) === 0 ? "AGOTADO" : (i.cantidad + adjustCantidad) <= i.stockMin ? "BAJO" : "NORMAL") as any } : i));
      toast.success(`Stock de ${adjustItem.producto} ajustado (+${adjustCantidad})`);
    }
    setAdjustDialogOpen(false);
  };

  const handleDelete = (item: InventoryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    toast.success(`${item.producto} eliminado del inventario`);
  };

  const handleExportPDF = () => toast.success("Exportando a PDF...");
  const handleExportExcel = () => toast.success("Exportando a Excel...");

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
          <p className="text-sm text-muted-foreground">Gestión de inventario por bodega</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="mr-1 h-3.5 w-3.5" />PDF</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><FileText className="mr-1 h-3.5 w-3.5" />Excel</Button>
          <Button variant="outline" size="sm"><Scan className="mr-1 h-3.5 w-3.5" />Escanear</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Items", value: stats.total, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Valor Total", value: formatCurrency(stats.valorTotal), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Stock Bajo", value: stats.bajoStock, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Sin Stock", value: stats.sinStock, icon: PackageX, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por código, producto o lote..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <select value={bodegaFilter} onChange={(e) => { setBodegaFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las bodegas</option>
              {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODOS">Todos los estados</option>
              <option value="NORMAL">Normal</option>
              <option value="BAJO">Bajo Stock</option>
              <option value="AGOTADO">Sin Stock</option>
            </select>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {selectedIds.size > 0 && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => toast.info("Mover seleccionados")}><ArrowLeftRight className="mr-1 h-3.5 w-3.5" />Mover ({selectedIds.size})</Button>
                <Button size="sm" variant="outline" onClick={() => toast.info("Ajustar seleccionados")}><Pencil className="mr-1 h-3.5 w-3.5" />Ajustar</Button>
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
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-400">{item.codigo}</td>
                    <td className="py-3 pr-4 font-medium text-white">{item.producto}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.categoria}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.bodega}</td>
                    <td className="py-3 pr-4 text-right text-white">{item.cantidad}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.unidad}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(item.costoUnit)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(item.precioUnit)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(item.valorTotal)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{item.stockMin}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={estadoVariant[item.estado]} className="text-[10px]">
                        {item.estado === "NORMAL" ? "Normal" : item.estado === "BAJO" ? "Bajo" : "Agotado"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{item.lote}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.vencimiento ? formatDate(item.vencimiento) : "N/A"}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Ver historial kardex")}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleAdjust(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={15} className="py-12 text-center text-muted-foreground">No se encontraron items en el inventario</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length} items
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Ajustar Stock</DialogTitle>
            <DialogDescription>
              {adjustItem?.producto} - Actual: {adjustItem?.cantidad} {adjustItem?.unidad}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Cantidad a ajustar (+/-)</Label>
              <Input type="number" value={adjustCantidad} onChange={(e) => setAdjustCantidad(Number(e.target.value))} className="text-white" />
            </div>
            <div className="rounded-lg bg-white/[0.02] p-3">
              <p className="text-xs text-muted-foreground">Resultado: {adjustItem ? adjustItem.cantidad + adjustCantidad : 0} unidades</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmAdjust}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
