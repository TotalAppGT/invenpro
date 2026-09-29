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
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, Users, UserCheck, DollarSign } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  contacto: string | null;
  listaPrecio: { id: string; nombre: string } | null;
  listaPrecioId: string | null;
  limiteCredito: number;
  diasCredito: number;
  saldo: number;
  activo: boolean;
  notas: string | null;
  ventasCount: number;
}

interface Lista { id: string; nombre: string; }

const emptyForm = {
  nombre: "", nit: "", direccion: "", telefono: "", email: "", contacto: "",
  listaPrecioId: "", limiteCredito: 0, diasCredito: 0, activo: true, notas: "",
};

export default function ClientesPage() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [c, l] = await Promise.all([api<Cliente[]>("/api/clientes?limit=100"), api<Lista[]>("/api/listas-precio")]);
    if (c.success) setClientes(c.data ?? []); else toast.error(c.error);
    if (l.success) setListas(l.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q) || (c.nit ?? "").toLowerCase().includes(q) || (c.telefono ?? "").includes(q));
  }, [clientes, search]);

  const openNew = () => { setEditing(null); setForm({ ...emptyForm }); setDialogOpen(true); };
  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      nombre: c.nombre, nit: c.nit ?? "", direccion: c.direccion ?? "", telefono: c.telefono ?? "",
      email: c.email ?? "", contacto: c.contacto ?? "", listaPrecioId: c.listaPrecioId ?? "",
      limiteCredito: c.limiteCredito, diasCredito: c.diasCredito, activo: c.activo, notas: c.notas ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = { ...form, listaPrecioId: form.listaPrecioId || null, email: form.email || null };
    const res = editing
      ? await api(`/api/clientes/${editing.id}`, { method: "PATCH", body: payload })
      : await api("/api/clientes", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) { toast.success(editing ? "Cliente actualizado" : "Cliente creado"); setDialogOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const handleDelete = async (c: Cliente) => {
    if (!confirm(`¿Eliminar el cliente "${c.nombre}"?`)) return;
    const res = await api(`/api/clientes/${c.id}`, { method: "DELETE" });
    if (res.success) { toast.success(res.message ?? "Cliente eliminado"); fetchData(); }
    else toast.error(res.error);
  };

  const stats = useMemo(() => ({
    total: clientes.length,
    activos: clientes.filter((c) => c.activo).length,
    cartera: clientes.reduce((s, c) => s + c.saldo, 0),
  }), [clientes]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cartera de clientes, crédito y listas de precios</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nuevo Cliente</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Clientes", value: stats.total, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Activos", value: stats.activos, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Cartera (saldo)", value: formatCurrency(stats.cartera), icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">NIT</th>
                  <th className="pb-3 pr-4 font-medium">Teléfono</th>
                  <th className="pb-3 pr-4 font-medium">Lista</th>
                  <th className="pb-3 pr-4 font-medium text-right">Crédito</th>
                  <th className="pb-3 pr-4 font-medium text-right">Saldo</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white">{c.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.nit || "C/F"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.telefono || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.listaPrecio?.nombre || "Base"}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(c.limiteCredito)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(c.saldo)}</td>
                    <td className="py-3 pr-4"><Badge variant={c.activo ? "success" : "default"} className="text-[10px]">{c.activo ? "Activo" : "Inactivo"}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No hay clientes registrados</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>Datos generales y condiciones de crédito</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2"><Label className="text-white">Nombre *</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">NIT</Label><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="C/F" /></div>
            <div className="space-y-2"><Label className="text-white">Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Contacto</Label><Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="col-span-2 space-y-2"><Label className="text-white">Dirección</Label><Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
            <div className="space-y-2">
              <Label className="text-white">Lista de precios</Label>
              <Select value={form.listaPrecioId || "none"} onValueChange={(v) => setForm({ ...form, listaPrecioId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Base" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Base (sin lista)</SelectItem>
                  {listas.map((l) => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Límite crédito</Label><Input type="number" value={form.limiteCredito} onChange={(e) => setForm({ ...form, limiteCredito: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label className="text-white">Días crédito</Label><Input type="number" value={form.diasCredito} onChange={(e) => setForm({ ...form, diasCredito: Number(e.target.value) })} /></div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <Label className="text-white">Activo</Label>
              <Switch checked={form.activo} onCheckedChange={(c) => setForm({ ...form, activo: c })} />
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
