"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";

interface ProveedorItem {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  nit: string | null;
  notas: string | null;
  productosCount: number;
  createdAt: string;
}

interface ProveedorFormData {
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
  nit: string;
  notas: string;
}

const emptyForm: ProveedorFormData = { nombre: "", contacto: "", telefono: "", email: "", direccion: "", nit: "", notas: "" };

export default function ProveedoresPage() {
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProv, setEditingProv] = useState<ProveedorItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProveedorFormData>({ ...emptyForm });

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    const res = await api<ProveedorItem[]>("/api/proveedores?limit=100");
    if (res.success) setProveedores(res.data ?? []);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

  const filtered = useMemo(() => {
    if (!search) return proveedores;
    const q = search.toLowerCase();
    return proveedores.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      (p.contacto ?? "").toLowerCase().includes(q) ||
      (p.nit ?? "").includes(q) ||
      (p.email ?? "").toLowerCase().includes(q)
    );
  }, [proveedores, search]);

  const openNew = () => { setEditingProv(null); setForm({ ...emptyForm }); setDialogOpen(true); };

  const openEdit = (p: ProveedorItem) => {
    setEditingProv(p);
    setForm({
      nombre: p.nombre, contacto: p.contacto || "", telefono: p.telefono || "",
      email: p.email || "", direccion: p.direccion || "", nit: p.nit || "", notas: p.notas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      nombre: form.nombre,
      contacto: form.contacto || null,
      telefono: form.telefono || null,
      email: form.email || null,
      direccion: form.direccion || null,
      nit: form.nit || null,
      notas: form.notas || null,
    };
    const res = editingProv
      ? await api(`/api/proveedores/${editingProv.id}`, { method: "PUT", body: payload })
      : await api("/api/proveedores", { method: "POST", body: payload });
    setSaving(false);
    if (res.success) {
      toast.success(editingProv ? "Proveedor actualizado" : "Proveedor creado");
      setDialogOpen(false);
      fetchProveedores();
    } else toast.error(res.error);
  };

  const handleDelete = async (p: ProveedorItem) => {
    if (!confirm(`¿Eliminar el proveedor "${p.nombre}"?`)) return;
    const res = await api(`/api/proveedores/${p.id}`, { method: "DELETE" });
    if (res.success) { toast.success(res.message ?? "Proveedor eliminado"); fetchProveedores(); }
    else toast.error(res.error);
  };

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Gestión de proveedores y contactos</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nuevo Proveedor</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar proveedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Contacto</th>
                  <th className="pb-3 pr-4 font-medium">Teléfono</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">NIT</th>
                  <th className="pb-3 pr-4 font-medium text-right">Productos</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white">{p.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.contacto || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.telefono || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.email || "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.nit || "—"}</td>
                    <td className="py-3 pr-4 text-right text-white">{p.productosCount}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No se encontraron proveedores</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingProv ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
            <DialogDescription>Complete los datos del proveedor</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Razón social" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Contacto</Label>
              <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del contacto" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="5555-0000" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="correo@empresa.com" type="email" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">NIT</Label>
              <Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="1234567-8 o C/F" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Dirección completa" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Notas</Label>
              <Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Notas adicionales" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editingProv ? "Guardar Cambios" : "Crear Proveedor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
