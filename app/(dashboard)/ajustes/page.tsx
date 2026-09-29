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
import { Plus, Check, X, Trash2, ClipboardList, Clock, CheckCircle2 } from "lucide-react";

interface Item { id: string; productoId: string; cantidadSistema: number; cantidadFisica: number; diferencia: number; producto: { codigo: string; nombre: string }; }
interface Ajuste {
  id: string; numero: string; estado: string; motivo: string; fechaAprobacion: string | null; createdAt: string;
  bodega: { nombre: string }; solicitante: { nombre: string }; aprobador: { nombre: string } | null; items: Item[];
}
interface Producto { id: string; codigo: string; nombre: string; costoUnit: number; }
interface Bodega { id: string; nombre: string; }

const estadoVariant = (e: string) => e === "PENDIENTE" ? "warning" : e === "EJECUTADO" ? "success" : "destructive";

export default function AjustesPage() {
  const [loading, setLoading] = useState(true);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ motivo: "", observacion: "", bodegaId: "" });
  const [items, setItems] = useState<{ productoId: string; cantidadFisica: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [a, p, b] = await Promise.all([
      api<Ajuste[]>("/api/ajustes?limit=100"),
      api<Producto[]>("/api/productos?limit=100"),
      api<Bodega[]>("/api/bodegas"),
    ]);
    if (a.success) setAjustes(a.data ?? []); else toast.error(a.error);
    if (p.success) setProductos(p.data ?? []);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setForm({ motivo: "", observacion: "", bodegaId: bodegas[0]?.id ?? "" });
    setItems([{ productoId: productos[0]?.id ?? "", cantidadFisica: 0 }]);
    setDialogOpen(true);
  };

  const addItem = () => setItems((prev) => [...prev, { productoId: productos[0]?.id ?? "", cantidadFisica: 0 }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<{ productoId: string; cantidadFisica: number }>) =>
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const handleSave = async () => {
    if (!form.motivo || !form.bodegaId || items.length === 0) { toast.error("Motivo, bodega y al menos un item son obligatorios"); return; }
    setSaving(true);
    const payload = {
      motivo: form.motivo,
      observacion: form.observacion || null,
      bodegaId: form.bodegaId,
      items: items.map((it) => ({ productoId: it.productoId, cantidadSistema: 0, cantidadFisica: Number(it.cantidadFisica) || 0, costoUnit: 0 })),
    };
    const res = await api("/api/ajustes", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) { toast.success("Ajuste solicitado"); setDialogOpen(false); fetchData(); } else toast.error(res.error);
  };

  const accion = async (a: Ajuste, accionNombre: string) => {
    const res = await api(`/api/ajustes/${a.id}`, { method: "PATCH", body: { accion: accionNombre } });
    if (res.success) { toast.success(res.message ?? "Listo"); fetchData(); } else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: ajustes.length,
    pendientes: ajustes.filter((a) => a.estado === "PENDIENTE").length,
    ejecutados: ajustes.filter((a) => a.estado === "EJECUTADO").length,
  }), [ajustes]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ajustes de Inventario</h1>
          <p className="text-sm text-muted-foreground">Ajustes con flujo de aprobación antes de afectar el stock</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Solicitar Ajuste</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total", value: stats.total, icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Pendientes", value: stats.pendientes, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Ejecutados", value: stats.ejecutados, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
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
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Número</th>
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium">Motivo</th>
                  <th className="pb-3 pr-4 font-medium">Solicitante</th>
                  <th className="pb-3 pr-4 font-medium text-right">Items</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr key={a.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{a.numero}</td>
                    <td className="py-3 pr-4 text-white">{a.bodega?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.motivo}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{a.solicitante?.nombre}</td>
                    <td className="py-3 pr-4 text-right text-white">{a.items.length}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(a.estado) as never} className="text-[10px]">{a.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      {a.estado === "PENDIENTE" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" title="Aprobar y ejecutar" onClick={() => accion(a, "APROBAR")}><Check className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" title="Rechazar" onClick={() => accion(a, "RECHAZAR")}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {ajustes.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay ajustes registrados</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Solicitar Ajuste de Inventario</DialogTitle>
            <DialogDescription>Quedará pendiente de aprobación por un supervisor o administrador</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Bodega *</Label>
              <Select value={form.bodegaId} onValueChange={(v) => setForm({ ...form, bodegaId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Motivo *</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Merma, daño, error de digitación..." /></div>
            <div className="space-y-2"><Label className="text-white">Observación</Label><Input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label className="text-white">Items (cantidad física real)</Label><Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1 h-3 w-3" />Agregar</Button></div>
              {items.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <Select value={it.productoId} onValueChange={(v) => updateItem(i, { productoId: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Producto" /></SelectTrigger>
                    <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="w-32" type="number" placeholder="Cant. física" value={it.cantidadFisica} onChange={(e) => updateItem(i, { cantidadFisica: Number(e.target.value) })} />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Solicitar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
