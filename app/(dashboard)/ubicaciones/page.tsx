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
import { Search, Plus, Pencil, Trash2, MapPin, Boxes, Layers } from "lucide-react";

const TIPOS = ["ZONA", "PASILLO", "RACK", "ESTANTE", "NIVEL", "POSICION", "PISO"] as const;

interface Ubicacion {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  posicion: string | null;
  capacidad: number;
  activa: boolean;
  bodega: { id: string; nombre: string };
  bodegaId: string;
  productosCount: number;
  seriesCount: number;
}

interface Bodega {
  id: string;
  nombre: string;
}

const emptyForm = {
  codigo: "", nombre: "", tipo: "POSICION", pasillo: "", rack: "", nivel: "", posicion: "", capacidad: 0, activa: true, bodegaId: "",
};

export default function UbicacionesPage() {
  const [loading, setLoading] = useState(true);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [search, setSearch] = useState("");
  const [bodegaFiltro, setBodegaFiltro] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ubicacion | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [u, b] = await Promise.all([api<Ubicacion[]>("/api/ubicaciones"), api<Bodega[]>("/api/bodegas")]);
    if (u.success) setUbicaciones(u.data ?? []);
    else toast.error(u.error);
    if (b.success) setBodegas(b.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ubicaciones.filter((u) => {
      const matchBodega = bodegaFiltro === "todas" || u.bodegaId === bodegaFiltro;
      const matchSearch = !q || u.nombre.toLowerCase().includes(q) || u.codigo.toLowerCase().includes(q) || (u.rack ?? "").toLowerCase().includes(q);
      return matchBodega && matchSearch;
    });
  }, [ubicaciones, search, bodegaFiltro]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, bodegaId: bodegas[0]?.id ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (u: Ubicacion) => {
    setEditing(u);
    setForm({
      codigo: u.codigo, nombre: u.nombre, tipo: u.tipo,
      pasillo: u.pasillo ?? "", rack: u.rack ?? "", nivel: u.nivel ?? "", posicion: u.posicion ?? "",
      capacidad: u.capacidad, activa: u.activa, bodegaId: u.bodegaId,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || !form.nombre || !form.bodegaId) {
      toast.error("Código, nombre y bodega son obligatorios");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      pasillo: form.pasillo || null, rack: form.rack || null, nivel: form.nivel || null, posicion: form.posicion || null,
      capacidad: Number(form.capacidad) || 0,
    };
    const res = editing
      ? await api(`/api/ubicaciones/${editing.id}`, { method: "PATCH", body: payload })
      : await api("/api/ubicaciones", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) {
      toast.success(editing ? "Ubicación actualizada" : "Ubicación creada");
      setDialogOpen(false);
      fetchData();
    } else {
      toast.error(res.error);
    }
  };

  const handleDelete = async (u: Ubicacion) => {
    if (!confirm(`¿Eliminar la ubicación ${u.codigo}?`)) return;
    const res = await api(`/api/ubicaciones/${u.id}`, { method: "DELETE" });
    if (res.success) { toast.success("Ubicación eliminada"); fetchData(); }
    else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: ubicaciones.length,
    activas: ubicaciones.filter((u) => u.activa).length,
    conStock: ubicaciones.filter((u) => u.productosCount > 0).length,
  }), [ubicaciones]);

  if (loading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ubicaciones (Bins)</h1>
          <p className="text-sm text-muted-foreground">Control de pasillos, racks, niveles y posiciones por bodega</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva Ubicación</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Ubicaciones", value: stats.total, icon: MapPin, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Activas", value: stats.activas, icon: Boxes, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Con Inventario", value: stats.conStock, icon: Layers, color: "text-indigo-400", bg: "bg-indigo-500/10" },
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
          <Input placeholder="Buscar por código, nombre o rack..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={bodegaFiltro} onValueChange={setBodegaFiltro}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Todas las bodegas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las bodegas</SelectItem>
            {bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Ubicación física</th>
                  <th className="pb-3 pr-4 font-medium">Bodega</th>
                  <th className="pb-3 pr-4 font-medium text-right">Productos</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{u.codigo}</td>
                    <td className="py-3 pr-4 font-medium text-white">{u.nombre}</td>
                    <td className="py-3 pr-4"><Badge variant="default" className="text-[10px]">{u.tipo}</Badge></td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {[u.pasillo && `P:${u.pasillo}`, u.rack && `R:${u.rack}`, u.nivel && `N:${u.nivel}`, u.posicion && `Pos:${u.posicion}`].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.bodega?.nombre}</td>
                    <td className="py-3 pr-4 text-right text-white">{u.productosCount}</td>
                    <td className="py-3 pr-4"><Badge variant={u.activa ? "success" : "default"} className="text-[10px]">{u.activa ? "Activa" : "Inactiva"}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No hay ubicaciones. Crea la primera para organizar tu bodega.</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
            <DialogDescription>Define la ubicación física dentro de la bodega</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Código *</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="A-01-03" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Rack A nivel 1" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Bodega *</Label>
              <Select value={form.bodegaId} onValueChange={(v) => setForm({ ...form, bodegaId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Pasillo</Label><Input value={form.pasillo} onChange={(e) => setForm({ ...form, pasillo: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Rack</Label><Input value={form.rack} onChange={(e) => setForm({ ...form, rack: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Nivel</Label><Input value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Posición</Label><Input value={form.posicion} onChange={(e) => setForm({ ...form, posicion: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Capacidad</Label><Input type="number" value={form.capacidad} onChange={(e) => setForm({ ...form, capacidad: Number(e.target.value) })} /></div>
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
