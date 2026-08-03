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
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { Search, Plus, Pencil, Trash2, UserPlus, Mail, Shield, Clock } from "lucide-react";

interface UsuarioItem {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  ultimoAcceso: string | null;
  createdAt: string;
}

interface UsuarioFormData {
  nombre: string;
  email: string;
  rol: string;
}

const rolBadge: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "bg-purple-500/10 text-purple-400" },
  SUPERVISOR: { label: "Supervisor", color: "bg-blue-500/10 text-blue-400" },
  OPERADOR: { label: "Operador", color: "bg-emerald-500/10 text-emerald-400" },
  CONSULTOR: { label: "Consultor", color: "bg-gray-500/10 text-gray-400" },
};

export default function UsuariosPage() {
  const { user: currentUser, isAdmin, isSupervisor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UsuarioItem | null>(null);
  const [form, setForm] = useState<UsuarioFormData>({ nombre: "", email: "", rol: "OPERADOR" });

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const mock: UsuarioItem[] = [
      { id: "1", nombre: "Juan Pérez", email: "juan@empresa.com", rol: "ADMIN", estado: "ACTIVO", ultimoAcceso: new Date().toISOString(), createdAt: new Date("2024-11-15").toISOString() },
      { id: "2", nombre: "María García", email: "maria@empresa.com", rol: "SUPERVISOR", estado: "ACTIVO", ultimoAcceso: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date("2025-01-10").toISOString() },
      { id: "3", nombre: "Carlos López", email: "carlos@empresa.com", rol: "OPERADOR", estado: "ACTIVO", ultimoAcceso: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date("2025-03-05").toISOString() },
      { id: "4", nombre: "Ana Martínez", email: "ana@empresa.com", rol: "OPERADOR", estado: "INACTIVO", ultimoAcceso: null, createdAt: new Date("2025-06-20").toISOString() },
      { id: "5", nombre: "Pedro Ramírez", email: "pedro@empresa.com", rol: "CONSULTOR", estado: "ACTIVO", ultimoAcceso: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date("2025-08-01").toISOString() },
      { id: "6", nombre: "Sofía Reyes", email: "sofia@empresa.com", rol: "OPERADOR", estado: "ACTIVO", ultimoAcceso: new Date().toISOString(), createdAt: new Date("2025-09-15").toISOString() },
    ];
    setUsuarios(mock);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtered = useMemo(() => {
    if (!search) return usuarios;
    const q = search.toLowerCase();
    return usuarios.filter((u) => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [usuarios, search]);

  const openInvite = () => {
    setEditingUser(null);
    setForm({ nombre: "", email: "", rol: "OPERADOR" });
    setDialogOpen(true);
  };

  const openEdit = (u: UsuarioItem) => {
    setEditingUser(u);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre || !form.email) { toast.error("Nombre y email son obligatorios"); return; }
    if (editingUser) {
      setUsuarios((prev) => prev.map((u) => u.id === editingUser.id ? { ...u, ...form } : u));
      toast.success(`Usuario ${form.nombre} actualizado`);
    } else {
      const newUser: UsuarioItem = {
        id: `user-${Date.now()}`, ...form, estado: "ACTIVO",
        ultimoAcceso: null, createdAt: new Date().toISOString(),
      };
      setUsuarios((prev) => [...prev, newUser]);
      toast.success(`Invitación enviada a ${form.email}`);
    }
    setDialogOpen(false);
  };

  const confirmDelete = (u: UsuarioItem) => {
    if (currentUser?.email === u.email) {
      toast.error("No puedes eliminar tu propio usuario");
      return;
    }
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!userToDelete) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== userToDelete.id));
    toast.success(`Usuario ${userToDelete.nombre} eliminado`);
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  if (!isAdmin && !isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">Acceso restringido</p>
        <p className="text-sm text-muted-foreground/60">Solo administradores y supervisores pueden acceder</p>
      </div>
    );
  }

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios del sistema</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={openInvite}>
            <UserPlus className="mr-1 h-4 w-4" />Invitar Usuario
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Email</th>
                  <th className="pb-3 pr-4 font-medium">Rol</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Último Acceso</th>
                  <th className="pb-3 pr-4 font-medium">Creado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white">{u.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4">
                      <Badge className={cn("text-[10px]", rolBadge[u.rol]?.color || "bg-gray-500/10 text-gray-400")}>
                        {rolBadge[u.rol]?.label || u.rol}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={u.estado === "ACTIVO" ? "success" : "default"} className="text-[10px]">
                        {u.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : "Nunca"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button
                          variant="ghost" size="icon"
                          className={cn("h-7 w-7", currentUser?.email === u.email ? "opacity-30 cursor-not-allowed" : "text-red-400 hover:text-red-300")}
                          onClick={() => confirmDelete(u)}
                          disabled={currentUser?.email === u.email}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No se encontraron usuarios</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editingUser ? "Editar Usuario" : "Invitar Usuario"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Modificar datos del usuario" : "Enviar invitación por correo electrónico"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email *</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="correo@empresa.com" disabled={!!editingUser} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Rol</Label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                <option value="ADMIN">Administrador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="OPERADOR">Operador</option>
                <option value="CONSULTOR">Consultor</option>
              </select>
            </div>
            {!editingUser && (
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <p className="text-xs text-indigo-400">Se enviará una invitación por correo a {form.email || "..."}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingUser ? "Guardar Cambios" : "Enviar Invitación"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará al usuario <strong className="text-white">{userToDelete?.nombre}</strong> ({userToDelete?.email}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
