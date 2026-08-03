"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { getInitials, cn, formatDateTime } from "@/lib/utils";
import {
  User, Mail, Shield, Building2, Key, Bell, Monitor, Smartphone,
  LogOut, Trash2, Clock, AlertTriangle,
} from "lucide-react";

const rolBadge: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Administrador", color: "bg-purple-500/10 text-purple-400" },
  SUPERVISOR: { label: "Supervisor", color: "bg-blue-500/10 text-blue-400" },
  OPERADOR: { label: "Operador", color: "bg-emerald-500/10 text-emerald-400" },
  CONSULTOR: { label: "Consultor", color: "bg-gray-500/10 text-gray-400" },
};

export default function PerfilPage() {
  const { user, tenant, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifMovements, setNotifMovements] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Complete todos los campos de contraseña");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    toast.success("Contraseña actualizada correctamente");
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  const handleLogoutAll = async () => {
    toast.success("Cerrando todas las sesiones activas...");
    await logout();
  };

  const handleDeleteAccount = () => {
    toast.success("Solicitud de eliminación enviada");
    setDeleteConfirmOpen(false);
  };

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu cuenta y preferencias</p>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/20">
              {user.photo ? (
                <img src={user.photo} alt={user.nombre} className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(user.nombre)
              )}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">{user.nombre}</h2>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge className={cn("text-xs", rolBadge[user.rol]?.color || "bg-gray-500/10 text-gray-400")}>
                  {rolBadge[user.rol]?.label || user.rol}
                </Badge>
                {tenant && (
                  <Badge className="bg-indigo-500/10 text-indigo-400 text-xs">{tenant.name}</Badge>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6 border-white/[0.04]" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="text-sm font-medium text-white">{user.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-white">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rol</p>
                <p className="text-sm font-medium text-white">{rolBadge[user.rol]?.label || user.rol}</p>
              </div>
            </div>
            {tenant && (
              <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="text-sm font-medium text-white">{tenant.name}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">Contraseña Actual</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Ingresa tu contraseña actual" />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Nueva Contraseña</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label className="text-white">Confirmar Contraseña</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la nueva contraseña" />
          </div>
          <Button onClick={handleChangePassword}>
            <Key className="mr-2 h-4 w-4" />Cambiar Contraseña
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Notificaciones</CardTitle>
          <CardDescription>Configura tus preferencias de notificación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-white">Notificaciones por Email</p>
                <p className="text-xs text-muted-foreground">Recibir notificaciones en tu correo</p>
              </div>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-white">Alertas de Stock Bajo</p>
                <p className="text-xs text-muted-foreground">Notificar cuando el inventario esté bajo</p>
              </div>
            </div>
            <Switch checked={notifStock} onCheckedChange={setNotifStock} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-white">Resumen de Movimientos</p>
                <p className="text-xs text-muted-foreground">Recibir resumen diario de movimientos</p>
              </div>
            </div>
            <Switch checked={notifMovements} onCheckedChange={setNotifMovements} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Sesiones</CardTitle>
          <CardDescription>Información de tu sesión activa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
            <Monitor className="h-5 w-5 text-emerald-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">Sesión Actual</p>
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-xs text-muted-foreground">Windows · Chrome · Guatemala</p>
            </div>
            <span className="text-xs text-muted-foreground">Activa ahora</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.02] p-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Móvil</p>
              <p className="text-xs text-muted-foreground">iPhone · Safari · Guatemala</p>
            </div>
            <span className="text-xs text-muted-foreground">Hace 2 horas</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogoutAll}>
            <LogOut className="mr-2 h-4 w-4" />Cerrar todas las sesiones
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/10 bg-red-500/[0.02]">
        <CardHeader>
          <CardTitle className="text-red-400">Zona de Peligro</CardTitle>
          <CardDescription>Acciones irreversibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-red-500/10 p-4">
            <div>
              <p className="text-sm font-medium text-white">Eliminar Cuenta</p>
              <p className="text-xs text-muted-foreground">Eliminar permanentemente tu cuenta y todos tus datos</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border border-red-500/10 bg-[#0a0a2a] p-6"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Eliminar Cuenta</h3>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Se eliminarán permanentemente todos tus datos, acceso y configuraciones asociadas a esta cuenta.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDeleteAccount}>Eliminar Permanentemente</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
