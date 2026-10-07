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
import { Plus, Trash2, Send, Check, X, ArrowRightCircle, FileText } from "lucide-react";

interface Cotizacion {
  id: string; numero: string; estado: string;
  cliente: { id: string; nombre: string }; fecha: string;
  total: number; itemsCount: number; validaHasta: string | null;
}
interface Producto { id: string; codigo: string; nombre: string; precioUnit: number; }
interface Cliente { id: string; nombre: string; }
interface Bodega { id: string; nombre: string; }

const estadoVariant = (e: string) => e === "CONVERTIDA" ? "success" : e === "ACEPTADA" ? "success" : e === "RECHAZADA" || e === "ANULADA" ? "destructive" : "warning";

export default function CotizacionesPage() {
  const [loading, setLoading] = useState(true);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertCot, setConvertCot] = useState<Cotizacion | null>(null);
  const [convertBodega, setConvertBodega] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ clienteId: "", validaHasta: "", notas: "" });
  const [items, setItems] = useState<{ productoId: string; cantidad: number; precioUnit: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [c, p, cl, b] = await Promise.all([
      api<Cotizacion[]>("/api/cotizaciones?limit=100"),
      api<Producto[]>("/api/productos?limit=200"),
      api<Cliente[]>("/api/clientes?limit=200"),
      api<Bodega[]>("/api/bodegas"),
    ]);
    if (c.success) setCotizaciones(c.data ?? []); else toast.error(c.error);
    if (p.success) setProductos(p.data ?? []);
    if (cl.success) setClientes(cl.data ?? []);
    if (b.success) { setBodegas(b.data ?? []); if (b.data?.[0]) setConvertBodega(b.data[0].id); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalForm = useMemo(() => {
    const sub = items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
    return { sub, iva: sub * 0.12, total: sub * 1.12 };
  }, [items]);

  const openNew = () => {
    setForm({ clienteId: clientes[0]?.id ?? "", validaHasta: "", notas: "" });
    setItems([{ productoId: productos[0]?.id ?? "", cantidad: 1, precioUnit: productos[0]?.precioUnit ?? 0 }]);
    setDialogOpen(true);
  };

  const addItem = () => setItems((p) => [...p, { productoId: productos[0]?.id ?? "", cantidad: 1, precioUnit: productos[0]?.precioUnit ?? 0 }]);
  const updItem = (i: number, patch: Partial<{ productoId: string; cantidad: number; precioUnit: number }>) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const onProd = (i: number, id: string) => {
    const p = productos.find((x) => x.id === id);
    updItem(i, { productoId: id, precioUnit: Number(p?.precioUnit ?? 0) });
  };

  const guardar = async () => {
    if (!form.clienteId) { toast.error("Selecciona un cliente"); return; }
    if (items.length === 0) { toast.error("Agrega al menos un item"); return; }
    setSaving(true);
    const res = await api("/api/cotizaciones", {
      method: "POST",
      body: {
        clienteId: form.clienteId,
        validaHasta: form.validaHasta || null,
        notas: form.notas || null,
        impuestoPct: 12,
        items: items.map((i) => ({ productoId: i.productoId, cantidad: Number(i.cantidad) || 1, precioUnit: Number(i.precioUnit) || 0 })),
      },
    });
    setSaving(false);
    if (res.success) { toast.success("Cotización creada"); setDialogOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const accion = async (c: Cotizacion, accionNombre: string) => {
    const res = await api(`/api/cotizaciones/${c.id}`, { method: "PATCH", body: { accion: accionNombre } });
    if (res.success) { toast.success(res.message ?? "Listo"); fetchData(); } else toast.error(res.error);
  };

  const convertir = async () => {
    if (!convertCot) return;
    setSaving(true);
    const res = await api(`/api/cotizaciones/${convertCot.id}`, { method: "PATCH", body: { accion: "CONVERTIR", bodegaId: convertBodega } });
    setSaving(false);
    if (res.success) { toast.success(res.message ?? "Convertida"); setConvertOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">Cotizaciones y conversión a venta</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva Cotización</Button>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Número</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium text-right">Items</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{c.numero}</td>
                    <td className="py-3 pr-4 text-white">{c.cliente?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(c.fecha)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{c.itemsCount}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(c.total)}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(c.estado) as never} className="text-[10px]">{c.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        {c.estado === "BORRADOR" && <Button variant="ghost" size="icon" className="h-7 w-7" title="Enviar" onClick={() => accion(c, "ENVIAR")}><Send className="h-3.5 w-3.5" /></Button>}
                        {c.estado === "ENVIADA" && <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" title="Aceptar" onClick={() => accion(c, "ACEPTAR")}><Check className="h-3.5 w-3.5" /></Button>}
                        {["BORRADOR", "ENVIADA", "ACEPTADA"].includes(c.estado) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-400" title="Convertir a venta" onClick={() => { setConvertCot(c); setConvertOpen(true); }}><ArrowRightCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        {c.estado !== "CONVERTIDA" && c.estado !== "ANULADA" && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" title="Anular" onClick={() => accion(c, "ANULAR")}><X className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {cotizaciones.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay cotizaciones</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-white">Nueva Cotización</DialogTitle><DialogDescription>Se generará un documento cotizable</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Cliente *</Label>
                <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-white">Válida hasta</Label><Input type="date" value={form.validaHasta} onChange={(e) => setForm({ ...form, validaHasta: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-white">Items</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Agregar</Button></div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={it.productoId} onValueChange={(v) => onProd(i, v)}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-20" type="number" value={it.cantidad} onChange={(e) => updItem(i, { cantidad: Number(e.target.value) })} />
                  <Input className="w-24" type="number" value={it.precioUnit} onChange={(e) => updItem(i, { precioUnit: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <div className="space-y-2"><Label className="text-white">Notas</Label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(totalForm.sub)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>IVA 12%</span><span>{formatCurrency(totalForm.iva)}</span></div>
              <div className="flex justify-between font-bold text-white"><span>Total</span><span>{formatCurrency(totalForm.total)}</span></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={guardar} loading={saving}>Crear Cotización</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Convertir a Venta</DialogTitle><DialogDescription>Se descontará el stock de la bodega seleccionada</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Bodega</Label>
              <Select value={convertBodega} onValueChange={setConvertBodega}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setConvertOpen(false)}>Cancelar</Button><Button onClick={convertir} loading={saving}><FileText className="mr-1 h-4 w-4" />Convertir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
