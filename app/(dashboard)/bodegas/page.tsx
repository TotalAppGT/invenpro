"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatDate, cn } from "@/lib/utils";
import {
  Search, Plus, Pencil, Eye, Trash2, Warehouse, Package, CheckCircle, Grid3X3, List,
} from "lucide-react";

interface BodegaItem {
  id: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  encargado: string | null;
  activa: boolean;
  inventarioCount: number;
  createdAt: string;
}

interface BodegaFormData {
  nombre: string;
  direccion: string;
  telefono: string;
  encargado: string;
  activa: boolean;
}

const emptyForm: BodegaFormData = { nombre: "", direccion: "", telefono: "", encargado: "", activa: true };

export default function BodegasPage() {
  const [loading, setLoading] = useState(true);
  const [bodegas, setBodegas] = useState<BodegaItem[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBodega, setEditingBodega] = useState<BodegaItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BodegaFormData>({ ...emptyForm });

  const fetchBodegas = useCallback(async () => {
    setLoading(true);
    const res = await api<BodegaItem[]>("/api/bodegas?limit=100");
    if (res.success) setBodegas(res.data ?? []);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBodegas(); }, [fetchBodegas]);

  const filtered = useMemo(() => {
    if (!search) return bodegas;
    const q = search.toLowerCase();
    return bodegas.filter((b) => b.nombre.toLowerCase().includes(q) || (b.direccion ?? "").toLowerCase().includes(q) || (b.encargado ?? "").toLowerCase().includes(q));
  }, [bodegas, search]);

  const stats = useMemo(() => ({
    total: bodegas.length,
    activas: bodegas.filter((b) => b.activa).length,
    totalProductos: bodegas.reduce((s, b) => s + b.inventarioCount, 0),
  }), [bodegas]);

  const openNew = () => {
    setEditingBodega(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (b: BodegaItem) => {
    setEditingBodega(b);
    setForm({
      nombre: b.nombre, direccion: b.direccion || "", telefono: b.telefono || "",
      encargado: b.encargado || "", activa: b.activa,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      direccion: form.direccion || null,
      telefono: form.telefono || null,
      encargado: form.encargado || null,
      activa: form.activa,
    };
    const res = editingBodega
      ? await api(`/api/bodegas/${editingBodega.id}`, { method: "PUT", body: payload })
      : await api("/api/bodegas", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) {
      toast.success(editingBodega ? "Bodega actualizada" : "Bodega creada");
      setDialogOpen(false);
      fetchBodegas();
    } else toast.error(res.error);
  };

  const handleDelete = async (b: BodegaItem) => {
    if (!confirm(`¿Eliminar la bodega "${b.nombre}"?`)) return;
    const res = await api(`/api/bodegas/${b.id}`, { method: "DELETE" });
    if (res.success) { toast.success(res.message ?? "Bodega eliminada"); fetchBodegas(); }
    else toast.error(res.error);
  };

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bodegas</h1>
          <p className="text-sm text-muted-foreground">Gestión de almacenes y centros de distribución</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-white/[0.06] bg-[#0f0f2e] p-0.5">
            <button onClick={() => setViewMode("table")} className={cn("rounded-md px-2.5 py-1.5 text-sm", viewMode === "table" ? "bg-indigo-500/20 text-white" : "text-muted-foreground")}><List className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("grid")} className={cn("rounded-md px-2.5 py-1.5 text-sm", viewMode === "grid" ? "bg-indigo-500/20 text-white" : "text-muted-foreground")}><Grid3X3 className="h-4 w-4" /></button>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nueva Bodega</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Bodegas", value: stats.total, icon: Warehouse, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Bodegas Activas", value: stats.activas, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Registros de Inventario", value: stats.totalProductos, icon: Package, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar bodega..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {viewMode === "table" ? (
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Nombre</th>
                    <th className="pb-3 pr-4 font-medium">Dirección</th>
                    <th className="pb-3 pr-4 font-medium">Teléfono</th>
                    <th className="pb-3 pr-4 font-medium">Encargado</th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 pr-4 font-medium text-right">Inventario</th>
                    <th className="pb-3 pr-4 font-medium">Creado</th>
                    <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => (
                    <tr key={b.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-medium text-white">{b.nombre}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{b.direccion || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{b.telefono || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{b.encargado || "—"}</td>
                      <td className="py-3 pr-4"><Badge variant={b.activa ? "success" : "default"} className="text-[10px]">{b.activa ? "Activa" : "Inactiva"}</Badge></td>
                      <td className="py-3 pr-4 text-right text-white">{b.inventarioCount}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(b.createdAt)}</td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Link href={`/inventario`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                          </Link>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No se encontraron bodegas</td></tr>)}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <motion.div key={b.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-white/[0.04] bg-[#0a0a2a]/60 transition-colors hover:bg-white/[0.02]">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-500/10 p-2.5"><Warehouse className="h-5 w-5 text-blue-400" /></div>
                      <div>
                        <p className="font-medium text-white">{b.nombre}</p>
                        <p className="text-xs text-muted-foreground">{b.direccion || "Sin dirección"}</p>
                      </div>
                    </div>
                    <Badge variant={b.activa ? "success" : "default"} className="text-[10px]">{b.activa ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/[0.02] p-2 text-center">
                      <p className="text-lg font-bold text-white">{b.inventarioCount}</p>
                      <p className="text-[10px] text-muted-foreground">Registros</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.02] p-2 text-center">
                      <p className="truncate text-sm font-medium text-white">{b.encargado || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Encargado</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(b)}><Pencil className="mr-1 h-3 w-3" />Editar</Button>
                    <Link href={`/inventario`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs"><Eye className="mr-1 h-3 w-3" />Inventario</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editingBodega ? "Editar Bodega" : "Nueva Bodega"}</DialogTitle>
            <DialogDescription>Complete los datos de la bodega</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Bodega Central" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección o ciudad" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="5555-0000" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Encargado</Label>
              <Input value={form.encargado} onChange={(e) => setForm({ ...form, encargado: e.target.value })} placeholder="Nombre del encargado" />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <div>
                <Label className="text-white">Estado</Label>
                <p className="text-xs text-muted-foreground">Bodega activa</p>
              </div>
              <Switch checked={form.activa} onCheckedChange={(c) => setForm({ ...form, activa: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editingBodega ? "Guardar Cambios" : "Crear Bodega"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
