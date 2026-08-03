"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { formatDateTime, cn } from "@/lib/utils";
import {
  Search, Plus, Pencil, Trash2, UserPlus, Mail, Shield,
  Users, AlertTriangle, ChevronLeft, ChevronRight,
  Copy, Check, Eye, EyeOff, X,
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

const estadoBadge: Record<string, { label: string; variant: "success" | "default" }> = {
  ACTIVO: { label: "Activo", variant: "success" },
  INACTIVO: { label: "Inactivo", variant: "default" },
};

type DialogMode = "add" | "invite";

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
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UsuarioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    rol: "OPERADOR" as string,
    estado: "ACTIVO" as string,
    telefono: "",
  });

  const resetForm = () => {
    setForm({ nombre: "", email: "", rol: "OPERADOR", estado: "ACTIVO", telefono: "" });
    setSendInvite(false);
  };

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

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchUsuarios();
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchUsuarios();
  }, [filterRol, filterEstado]);

  const openAdd = () => {
    setEditingUser(null);
    setDialogMode("add");
    resetForm();
    setDialogOpen(true);
  };

  const openInvite = () => {
    setEditingUser(null);
    setDialogMode("invite");
    resetForm();
    setSendInvite(true);
    setDialogOpen(true);
  };

  const openEdit = (u: UsuarioItem) => {
    setEditingUser(u);
    setDialogMode("add");
    setForm({
      nombre: u.nombre,
      email: u.email,
      rol: u.rol,
      estado: u.estado,
      telefono: u.telefono || "",
    });
    setDialogOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setPasswordCopied(true);
      toast.success("Contrasena copiada al portapapeles");
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
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
            telefono: form.telefono || null,
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
      return;
    }

    if (dialogMode === "invite") {
      setSaving(true);
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
          if (data.data?.tempPassword) {
            setTempPassword(data.data.tempPassword);
            setPasswordDialogOpen(true);
          }
          toast.success(`Invitacion enviada a ${form.email}`);
          setDialogOpen(false);
          fetchUsuarios();
        } else {
          toast.error(data.error || "Error al invitar usuario");
        }
      } catch {
        toast.error("Error al invitar usuario");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          email: form.email,
          rol: form.rol,
          telefono: form.telefono || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.tempPassword) {
          setTempPassword(data.tempPassword);
          setPasswordDialogOpen(true);
        }
        toast.success(`Usuario ${form.nombre} creado`);
        setDialogOpen(false);
        fetchUsuarios();
      } else {
        toast.error(data.error || "Error al crear usuario");
      }
    } catch {
      toast.error("Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (u: UsuarioItem) => {
    if (currentUser?.id === u.id || currentUser?.uid === u.id) {
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
        toast.success(`Usuario ${userToDelete.nombre} desactivado`);
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
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
          <div className="flex gap-2">
            <Button onClick={openAdd} className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Usuario
            </Button>
            <Button onClick={openInvite} variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
              <Mail className="mr-2 h-4 w-4" />
              Invitar por Email
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRol} onValueChange={(v) => setFilterRol(v)}>
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
        <Select value={filterEstado} onValueChange={(v) => setFilterEstado(v)}>
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
                      <Badge
                        className={cn(
                          "text-[10px] border",
                          rolBadge[u.rol]?.color || "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}
                      >
                        {rolBadge[u.rol]?.label || u.rol}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={estadoBadge[u.estado]?.variant || "default"}
                        className="text-[10px]"
                      >
                        {estadoBadge[u.estado]?.label || u.estado}
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
                            (currentUser?.id === u.id || currentUser?.uid === u.id)
                              ? "opacity-30 cursor-not-allowed"
                              : "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          )}
                          onClick={() => confirmDelete(u)}
                          disabled={currentUser?.id === u.id || currentUser?.uid === u.id}
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
                      {isAdmin && (
                        <Button onClick={openAdd} size="sm" className="mt-4 bg-indigo-500 hover:bg-indigo-600">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Usuario
                        </Button>
                      )}
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
              ) : dialogMode === "invite" ? (
                <>
                  <Mail className="h-5 w-5 text-indigo-400" />
                  Invitar por Email
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-indigo-400" />
                  Agregar Usuario
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modificar datos del usuario"
                : dialogMode === "invite"
                ? "Envia una invitacion por correo con un enlace de acceso"
                : "Crea un nuevo usuario con contrasena temporal automatica"}
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
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-white">Telefono (opcional)</Label>
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+502 XXXX XXXX"
                />
              </div>
            )}
            {editingUser && (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Telefono</Label>
                  <Input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    placeholder="+502 XXXX XXXX"
                  />
                </div>
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
              </>
            )}
            {!editingUser && dialogMode === "invite" && (
              <div className="flex items-start gap-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
                <Checkbox
                  id="send-invite"
                  checked={sendInvite}
                  onCheckedChange={(c) => setSendInvite(!!c)}
                />
                <div>
                  <Label htmlFor="send-invite" className="text-sm text-white cursor-pointer">
                    Enviar invitacion por correo electronico
                  </Label>
                  <p className="text-xs text-white/40 mt-0.5">
                    El usuario recibira un email con su contrasena temporal y el enlace de acceso
                  </p>
                </div>
              </div>
            )}
            {!editingUser && dialogMode === "add" && (
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <p className="text-xs text-blue-400">
                    Se generara una contrasena temporal de 10 caracteres automaticamente
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600">
              {saving ? (
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              ) : null}
              {editingUser ? "Guardar Cambios" : dialogMode === "invite" ? "Enviar Invitacion" : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar Desactivacion
            </DialogTitle>
            <DialogDescription>
              Se desactivara al usuario{" "}
              <strong className="text-white">{userToDelete?.nombre}</strong> ({userToDelete?.email}).
              Podra reactivarse posteriormente.
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
              Desactivar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              Usuario Creado Exitosamente
            </DialogTitle>
            <DialogDescription>
              Copia la contrasena temporal. El usuario debera cambiarla en su primer inicio de sesion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-4">
              <Label className="text-sm text-white/60 mb-2 block">Contrasena Temporal</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md bg-black/40 border border-white/[0.06] px-3 py-2.5 font-mono text-lg tracking-wider text-green-400">
                  {passwordVisible ? tempPassword : "•".repeat(tempPassword.length)}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={() => copyToClipboard(tempPassword)}
              className="w-full bg-green-600 hover:bg-green-700"
              variant={passwordCopied ? "outline" : "default"}
            >
              {passwordCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Contrasena
                </>
              )}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
