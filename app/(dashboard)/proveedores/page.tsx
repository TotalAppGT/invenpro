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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import {
  Search, Plus, Pencil, Eye, Trash2, Truck, Phone, Mail, MapPin, FileText, User,
} from "lucide-react";

interface ProveedorItem {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  nit: string | null;
  notas: string | null;
  activo: boolean;
  productosCount: number;
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

export default function ProveedoresPage() {
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<ProveedorItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProv, setEditingProv] = useState<ProveedorItem | null>(null);
  const [form, setForm] = useState<ProveedorFormData>({
    nombre: "", contacto: "", telefono: "", email: "", direccion: "", nit: "", notas: "",
  });

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const mock: ProveedorItem[] = [
      { id: "1", nombre: "Distribuidora El Sol", contacto: "Carlos Méndez", telefono: "5555-1234", email: "ventas@elsol.com", direccion: "Zona 1, Guatemala", nit: "1234567-8", notas: "Proveedor principal de ferretería", activo: true, productosCount: 85 },
      { id: "2", nombre: "Importadora Tech", contacto: "Ana López", telefono: "5555-5678", email: "info@importech.com", direccion: "Zona 10, Guatemala", nit: "2345678-9", notas: null, activo: true, productosCount: 120 },
      { id: "3", nombre: "FerreMax SA", contacto: "Pedro Ramírez", telefono: "5555-9012", email: "pedro@ferremax.com", direccion: "Mixco, Guatemala", nit: "3456789-0", notas: "Condiciones de pago a 30 días", activo: true, productosCount: 45 },
      { id: "4", nombre: "Materiales del Norte", contacto: "María García", telefono: "5555-3456", email: null, direccion: "Cobán, Alta Verapaz", nit: null, notas: "Entrega rápida zona norte", activo: true, productosCount: 32 },
      { id: "5", nombre: "Pinturas y Más", contacto: null, telefono: "5555-7890", email: "ventas@pinturasyas.com", direccion: "Zona 9, Guatemala", nit: "4567890-1", notas: null, activo: false, productosCount: 18 },
      { id: "6", nombre: "Electro Guatemala", contacto: "José Hernández", telefono: "5555-2345", email: "jose@electrogt.com", direccion: "Villa Nueva", nit: "5678901-2", notas: "Descuento 10% por volumen", activo: true, productosCount: 67 },
      { id: "7", nombre: "Papelería Universal", contacto: "Sofía Reyes", telefono: "5555-6789", email: "sofia@papeluniversal.com", direccion: "Zona 4, Guatemala", nit: "6789012-3", notas: null, activo: true, productosCount: 28 },
      { id: "8", nombre: "ConstruFácil", contacto: "Diego Morales", telefono: "5555-0123", email: null, direccion: null, nit: null, notas: "Nuevo proveedor", activo: true, productosCount: 12 },
    ];
    setProveedores(mock);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

  const filtered = useMemo(() => {
    if (!search) return proveedores;
    const q = search.toLowerCase();
    return proveedores.filter((p) => p.nombre.toLowerCase().includes(q) || (p.contacto && p.contacto.toLowerCase().includes(q)) || (p.nit && p.nit.includes(q)) || (p.email && p.email.toLowerCase().includes(q)));
  }, [proveedores, search]);

  const openNew = () => {
    setEditingProv(null);
    setForm({ nombre: "", contacto: "", telefono: "", email: "", direccion: "", nit: "", notas: "" });
    setDialogOpen(true);
  };

  const openEdit = (p: ProveedorItem) => {
    setEditingProv(p);
    setForm({
      nombre: p.nombre, contacto: p.contacto || "", telefono: p.telefono || "",
      email: p.email || "", direccion: p.direccion || "", nit: p.nit || "", notas: p.notas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre) { toast.error("El nombre es obligatorio"); return; }
    if (editingProv) {
      setProveedores((prev) => prev.map((p) => p.id === editingProv.id ? { ...p, ...form, contacto: form.contacto || null, telefono: form.telefono || null, email: form.email || null, direccion: form.direccion || null, nit: form.nit || null, notas: form.notas || null } : p));
      toast.success(`Proveedor ${form.nombre} actualizado`);
    } else {
      const newP: ProveedorItem = {
        id: `prov-${Date.now()}`, ...form, contacto: form.contacto || null,
        telefono: form.telefono || null, email: form.email || null,
        direccion: form.direccion || null, nit: form.nit || null,
        notas: form.notas || null, activo: true, productosCount: 0,
      };
      setProveedores((prev) => [...prev, newP]);
      toast.success(`Proveedor ${form.nombre} creado`);
    }
    setDialogOpen(false);
  };

  const handleToggleActive = (p: ProveedorItem) => {
    setProveedores((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, activo: !pr.activo } : pr));
    toast.success(`${p.nombre} ${p.activo ? "desactivado" : "activado"}`);
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
                  <th className="pb-3 pr-4 font-medium">Estado</th>
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
                    <td className="py-3 pr-4">
                      <Badge variant={p.activo ? "success" : "default"} className="text-[10px]">
                        {p.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right text-white">{p.productosCount}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info(`Ver productos de ${p.nombre}`)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No se encontraron proveedores</td></tr>)}
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
              <Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} placeholder="1234567-8" />
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
            <Button onClick={handleSave}>{editingProv ? "Guardar Cambios" : "Crear Proveedor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
