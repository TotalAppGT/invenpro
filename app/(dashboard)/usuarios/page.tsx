"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import {
  Search, Plus, Pencil, Trash2, UserPlus, Mail, Shield, Clock,
  Users, AlertTriangle, Filter, ChevronLeft, ChevronRight,
} from "lucide-react";

interface UsuarioItem {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  estado: string;
  telefono: string | null;
  foto: string | null;
  ultimoAcceso: string | null;
  createdAt: string;
}

const rolBadge: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Admin", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  SUPERVISOR: { label: "Supervisor", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPERADOR: { label: "Operador", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  CONSULTOR: { label: "Consultor", color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

export default function UsuariosPage() {
  const { user: currentUser, isAdmin, isSupervisor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("ALL");
  const [filterEstado, setFilterEstado] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const perPage = 10;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UsuarioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol: "OPERADOR" as string,
    estado: "ACTIVO" as string,
  });

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", perPage.toString());
      if (search.trim()) params.set("search", search.trim());
      if (filterRol !== "ALL") params.set("rol", filterRol);
      if (filterEstado !== "ALL") params.set("estado", filterEstado);

      const res = await fetch(`/api/usuarios?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUsuarios(data.data || []);
        setTotalPages(data.meta?.totalPages || 1);
        setTotalUsers(data.meta?.total || 0);
      } else {
        toast.error(data.error || "Error al cargar usuarios");
      }
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRol, filterEstado]);

  useEffect(() => {
    if (isAdmin || isSupervisor) {
      fetchUsuarios();
    }
  }, [fetchUsuarios, isAdmin, isSupervisor, page]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const openInvite = () => {
    setEditingUser(null);
    setForm({ nombre: "", email: "", rol: "OPERADOR", estado: "ACTIVO" });
    setDialogOpen(true);
  };

  const openEdit = (u: UsuarioItem) => {
    setEditingUser(u);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, estado: u.estado });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || (!editingUser && !form.email)) {
      toast.error("Nombre y email son obligatorios");
      return;
    }

    if (editingUser) {
      setSaving(true);
      try {
        const res = await fetch(`/api/usuarios/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            rol: form.rol,
            estado: form.estado,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Usuario ${form.nombre} actualizado`);
          setDialogOpen(false);
          fetchUsuarios();
        } else {
          toast.error(data.error || "Error al actualizar usuario");
        }
      } catch {
        toast.error("Error al actualizar usuario");
      } finally {
        setSaving(false);
      }
    } else {
      setInviting(true);
      try {
        const res = await fetch("/api/usuarios/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: form.nombre,
            email: form.email,
            rol: form.rol,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Invitacion enviada a ${form.email}`);
          setDialogOpen(false);
          fetchUsuarios();
        } else {
          toast.error(data.error || "Error al invitar usuario");
        }
      } catch {
        toast.error("Error al invitar usuario");
      } finally {
        setInviting(false);
      }
    }
  };

  const confirmDelete = (u: UsuarioItem) => {
    if (currentUser?.email === u.email) {
      toast.error("No puedes eliminar tu propio usuario");
      return;
    }
    setUserToDelete(u);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/usuarios/${userToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Usuario ${userToDelete.nombre} eliminado`);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
        fetchUsuarios();
      } else {
        toast.error(data.error || "Error al eliminar usuario");
      }
    } catch {
      toast.error("Error al eliminar usuario");
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin && !isSupervisor) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Shield className="mb-4 h-16 w-16 text-white/10" />
        <p className="text-lg text-white/40">Acceso restringido</p>
        <p className="text-sm text-white/20">Solo administradores y supervisores pueden acceder</p>
      </div>
    );
  }

  if (loading && usuarios.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-400" />
            Usuarios
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Gestion de usuarios del sistema ({totalUsers} total)
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openInvite} className="bg-indigo-500 hover:bg-indigo-600">
            <UserPlus className="mr-2 h-4 w-4" />
            Invitar Usuario
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRol} onValueChange={(v) => { setFilterRol(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
            <SelectItem value="OPERADOR">Operador</SelectItem>
            <SelectItem value="CONSULTOR">Consultor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={(v) => { setFilterEstado(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVO">Activos</SelectItem>
            <SelectItem value="INACTIVO">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-white/50">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Ultimo Acceso</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{u.nombre}</td>
                    <td className="px-4 py-3 text-white/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px] border", rolBadge[u.rol]?.color || "bg-gray-500/10 text-gray-400")}>
                        {rolBadge[u.rol]?.label || u.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.estado === "ACTIVO" ? "success" : "default"}
                        className="text-[10px]"
                      >
                        {u.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white/40">
                      {u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : "Nunca"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8",
                            currentUser?.email === u.email
                              ? "opacity-30 cursor-not-allowed"
                              : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          )}
                          onClick={() => confirmDelete(u)}
                          disabled={currentUser?.email === u.email}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-white/10" />
                      <p className="text-white/40">No se encontraron usuarios</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">
                Pagina {page} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {editingUser ? (
                <>
                  <Pencil className="h-5 w-5 text-indigo-400" />
                  Editar Usuario
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-indigo-400" />
                  Invitar Usuario
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modificar datos del usuario"
                : "Envia una invitacion por correo electronico con un enlace de acceso"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Email *</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email"
                placeholder="correo@empresa.com"
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Rol</Label>
              <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="OPERADOR">Operador</SelectItem>
                  <SelectItem value="CONSULTOR">Consultor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingUser && (
              <div className="space-y-2">
                <Label className="text-white">Estado</Label>
                <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
                  <Switch
                    checked={form.estado === "ACTIVO"}
                    onCheckedChange={(c) => setForm({ ...form, estado: c ? "ACTIVO" : "INACTIVO" })}
                  />
                  <span className="text-sm text-white/60">
                    {form.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            )}
            {!editingUser && (
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  <p className="text-xs text-indigo-400">
                    Se enviara una invitacion por correo a {form.email || "..."} con su contraseña temporal
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || inviting} className="bg-indigo-500 hover:bg-indigo-600">
              {saving || inviting ? (
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : null}
              {editingUser ? "Guardar Cambios" : "Enviar Invitacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar Eliminacion
            </DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara al usuario{" "}
              <strong className="text-white">{userToDelete?.nombre}</strong> ({userToDelete?.email}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
