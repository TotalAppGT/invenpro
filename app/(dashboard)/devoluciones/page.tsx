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
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, Check, X, Trash2, RotateCcw, Undo2, Truck } from "lucide-react";

interface Item { id: string; productoId: string; cantidad: number; costoUnit: number; precioUnit: number; lote: string | null; reingresa: boolean; producto: { codigo: string; nombre: string }; }
interface Devolucion {
  id: string; numero: string; tipo: string; estado: string; motivo: string; total: number; fecha: string;
  bodega: { nombre: string }; cliente: { nombre: string } | null; proveedor: { nombre: string } | null;
  usuario: { nombre: string }; items: Item[];
}
interface Producto { id: string; codigo: string; nombre: string; costoUnit: number; precioUnit: number; }
interface Bodega { id: string; nombre: string; }

const estadoVariant = (e: string) => e === "PENDIENTE" ? "warning" : e === "APROBADA" ? "success" : e === "COMPLETADA" ? "default" : "destructive";

export default function DevolucionesPage() {
  const [loading, setLoading] = useState(true);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tipo: "CLIENTE", motivo: "", bodegaId: "", entidadId: "" });
  const [items, setItems] = useState<{ productoId: string; cantidad: number; lote: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [d, p, b] = await Promise.all([
      api<Devolucion[]>("/api/devoluciones?limit=100"),
      api<Producto[]>("/api/productos?limit=100"),
      api<Bodega[]>("/api/bodegas"),
    ]);
    if (d.success) setDevoluciones(d.data ?? []); else toast.error(d.error);
    if (p.success) setProductos(p.data ?? []);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => tipoFiltro === "todos" ? devoluciones : devoluciones.filter((d) => d.tipo === tipoFiltro), [devoluciones, tipoFiltro]);

  const openNew = () => {
    setForm({ tipo: "CLIENTE", motivo: "", bodegaId: bodegas[0]?.id ?? "", entidadId: "" });
    setItems([{ productoId: productos[0]?.id ?? "", cantidad: 1, lote: "" }]);
    setDialogOpen(true);
  };

  const addItem = () => setItems((prev) => [...prev, { productoId: productos[0]?.id ?? "", cantidad: 1, lote: "" }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<{ productoId: string; cantidad: number; lote: string }>) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const handleSave = async () => {
    if (!form.motivo || !form.bodegaId || items.length === 0) { toast.error("Motivo, bodega y al menos un item son obligatorios"); return; }
    setSaving(true);
    const payload = {
      tipo: form.tipo,
      motivo: form.motivo,
      bodegaId: form.bodegaId,
      clienteId: form.tipo === "CLIENTE" ? form.entidadId || null : null,
      proveedorId: form.tipo === "PROVEEDOR" ? form.entidadId || null : null,
      items: items.map((it) => {
        const p = productos.find((x) => x.id === it.productoId);
        return {
          productoId: it.productoId,
          cantidad: Number(it.cantidad) || 1,
          costoUnit: p ? p.costoUnit : 0,
          precioUnit: p ? p.precioUnit : 0,
          lote: it.lote || null,
          reingresa: true,
        };
      }),
    };
    const res = await api("/api/devoluciones", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) { toast.success("Devolución registrada"); setDialogOpen(false); fetchData(); } else toast.error(res.error);
  };

  const accion = async (d: Devolucion, accionNombre: string) => {
    const res = await api(`/api/devoluciones/${d.id}`, { method: "PATCH", body: { accion: accionNombre } });
    if (res.success) { toast.success(res.message ?? "Listo"); fetchData(); } else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: devoluciones.length,
    pendientes: devoluciones.filter((d) => d.estado === "PENDIENTE").length,
    valor: devoluciones.reduce((s, d) => s + d.total, 0),
  }), [devoluciones]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Devoluciones</h1>
          <p className="text-sm text-muted-foreground">Devoluciones de clientes y a proveedores con actualización de stock</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva Devolución</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total", value: stats.total, icon: RotateCcw, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pendientes", value: stats.pendientes, icon: Undo2, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Valor Total", value: formatCurrency(stats.valor), icon: Truck, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="CLIENTE">De cliente</SelectItem>
            <SelectItem value="PROVEEDOR">A proveedor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Número</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Entidad</th>
                  <th className="pb-3 pr-4 font-medium">Motivo</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{d.numero}</td>
                    <td className="py-3 pr-4"><Badge variant="default" className="text-[10px]">{d.tipo}</Badge></td>
                    <td className="py-3 pr-4 text-white">{d.cliente?.nombre || d.proveedor?.nombre || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{d.motivo}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(d.total)}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(d.estado) as never} className="text-[10px]">{d.estado}</Badge></td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(d.fecha)}</td>
                    <td className="py-3 pr-4 text-right">
                      {d.estado === "PENDIENTE" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" title="Aprobar y mover stock" onClick={() => accion(d, "APROBAR")}><Check className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" title="Rechazar" onClick={() => accion(d, "RECHAZAR")}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                      {d.estado === "APROBADA" && <Button variant="ghost" size="sm" className="text-xs" onClick={() => accion(d, "COMPLETAR")}>Completar</Button>}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No hay devoluciones</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Nueva Devolución</DialogTitle>
            <DialogDescription>Al aprobarse se ajusta el inventario automáticamente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CLIENTE">De cliente (reingresa)</SelectItem><SelectItem value="PROVEEDOR">A proveedor (sale)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Bodega *</Label>
                <Select value={form.bodegaId} onValueChange={(v) => setForm({ ...form, bodegaId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-white">Motivo *</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Producto dañado, error de pedido..." /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-white">Items</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Agregar</Button></div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={it.productoId} onValueChange={(v) => updateItem(i, { productoId: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-24" type="number" value={it.cantidad} onChange={(e) => updateItem(i, { cantidad: Number(e.target.value) })} />
                  <Input className="w-28" placeholder="Lote" value={it.lote} onChange={(e) => updateItem(i, { lote: e.target.value })} />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
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
