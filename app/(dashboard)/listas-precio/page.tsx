"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Tag, Users, Package, Star } from "lucide-react";

const TIPOS = ["BASE", "MAYOREO", "MENUDEO", "CLIENTE", "ESPECIAL"] as const;

interface Lista {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
  margen: number;
  esDefecto: boolean;
  activa: boolean;
  productosCount: number;
  clientesCount: number;
}

const emptyForm = { nombre: "", tipo: "BASE", moneda: "GTQ", margen: 0, esDefecto: false, activa: true };

export default function ListasPrecioPage() {
  const [loading, setLoading] = useState(true);
  const [listas, setListas] = useState<Lista[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lista | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api<Lista[]>("/api/listas-precio");
    if (res.success) setListas(res.data ?? []);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (l: Lista) => {
    setEditing(l);
    setForm({ nombre: l.nombre, tipo: l.tipo, moneda: l.moneda, margen: l.margen, esDefecto: l.esDefecto, activa: l.activa });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const res = editing
      ? await api(`/api/listas-precio/${editing.id}`, { method: "PATCH", body: form })
      : await api("/api/listas-precio", { method: "POST", body: form });
    setSaving(false);
    if (res.success) { toast.success(editing ? "Lista actualizada" : "Lista creada"); setDialogOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const handleDelete = async (l: Lista) => {
    if (!confirm(`¿Eliminar la lista "${l.nombre}"?`)) return;
    const res = await api(`/api/listas-precio/${l.id}`, { method: "DELETE" });
    if (res.success) { toast.success("Lista eliminada"); fetchData(); }
    else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: listas.length,
    activas: listas.filter((l) => l.activa).length,
    conClientes: listas.reduce((s, l) => s + l.clientesCount, 0),
  }), [listas]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Listas de Precios</h1>
          <p className="text-sm text-muted-foreground">Precios de mayoreo, menudeo y precios por cliente</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva Lista</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Listas", value: stats.total, icon: Tag, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Activas", value: stats.activas, icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Clientes Asignados", value: stats.conClientes, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listas.map((l) => (
          <Card key={l.id} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-white">{l.nombre}</p>
                  <p className="text-xs text-muted-foreground">{l.tipo} · {l.moneda}{l.margen > 0 ? ` · margen ${l.margen}%` : ""}</p>
                </div>
                {l.esDefecto && <Badge variant="success" className="text-[10px]">Por defecto</Badge>}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="h-3 w-3" />{l.productosCount} productos</span>
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{l.clientesCount} clientes</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(l)}><Pencil className="mr-1 h-3 w-3" />Editar</Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {listas.length === 0 && (
          <Card className="border-white/[0.04] bg-[#0a0a2a]/60 md:col-span-3"><CardContent className="py-12 text-center text-muted-foreground">No hay listas de precios</CardContent></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Editar Lista" : "Nueva Lista de Precios"}</DialogTitle>
            <DialogDescription>Define el tipo de precio y margen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-white">Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Mayoreo" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-white">Moneda</Label><Input value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label className="text-white">Margen sobre costo (%)</Label><Input type="number" value={form.margen} onChange={(e) => setForm({ ...form, margen: Number(e.target.value) })} /></div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <Label className="text-white">Lista por defecto</Label>
              <Switch checked={form.esDefecto} onCheckedChange={(c) => setForm({ ...form, esDefecto: c })} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <Label className="text-white">Activa</Label>
              <Switch checked={form.activa} onCheckedChange={(c) => setForm({ ...form, activa: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
