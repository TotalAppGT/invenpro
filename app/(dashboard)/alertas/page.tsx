"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell, BellRing, Plus, Pencil, Trash2, Mail, MessageCircle,
  Smartphone, Clock, AlertTriangle, CalendarClock, Package,
  Megaphone, Play, Pause, Search, X, Send, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";

const alertaSchema = z.object({
  tipo: z.enum(["STOCK_BAJO", "VENCIMIENTO", "MOVIMIENTO", "PERSONALIZADA"]),
  mensaje: z.string().min(3, "Minimo 3 caracteres"),
  productoId: z.string().optional(),
  destinatarios: z.string().min(1, "Al menos un destinatario"),
  telefonos: z.string().optional(),
  canales: z.array(z.enum(["EMAIL", "WHATSAPP", "NOTIFICACION_APP"])).min(1, "Selecciona un canal"),
  programacion: z.string().optional(),
  activa: z.boolean().default(true),
});

type AlertaForm = z.infer<typeof alertaSchema>;

interface Alerta {
  id: string;
  tipo: string;
  mensaje: string;
  productoId: string | null;
  producto?: { id: string; nombre: string } | null;
  destinatarios: string[];
  telefonos?: string[];
  canal: string[];
  programacion: string | null;
  activa: boolean;
  ultimoEnvio: string | null;
  createdAt: string;
}

interface ProductoOption { id: string; nombre: string; codigo: string; }

const tipoAlertaConfig: Record<string, { label: string; icon: typeof Bell; color: string }> = {
  STOCK_BAJO: { label: "Stock Bajo", icon: AlertTriangle, color: "text-yellow-400" },
  VENCIMIENTO: { label: "Vencimiento", icon: CalendarClock, color: "text-red-400" },
  MOVIMIENTO: { label: "Movimiento", icon: Package, color: "text-blue-400" },
  PERSONALIZADA: { label: "Personalizada", icon: Megaphone, color: "text-violet-400" },
};

const canalLabels: Record<string, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: "Email", icon: Mail },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  NOTIFICACION_APP: { label: "App", icon: Smartphone },
};

const programacionOptions = [
  { value: "", label: "Sin programacion (manual)" },
  { value: "0 * * * *", label: "Cada hora" },
  { value: "0 */6 * * *", label: "Cada 6 horas" },
  { value: "0 8 * * *", label: "Diario 8:00 AM" },
  { value: "0 8 * * 1", label: "Semanal (Lunes 8:00 AM)" },
  { value: "0 8 1 * *", label: "Mensual (Dia 1, 8:00 AM)" },
  { value: "CUSTOM", label: "Personalizada" },
];

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState<Alerta | null>(null);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [sendingNow, setSendingNow] = useState<Record<string, boolean>>({});
  const [customCron, setCustomCron] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<AlertaForm>({
    resolver: zodResolver(alertaSchema),
    defaultValues: { tipo: "STOCK_BAJO", canales: ["EMAIL"], activa: true, mensaje: "", destinatarios: "", telefonos: "" },
  });

  const canales = watch("canales");
  const programacion = watch("programacion");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertRes, prodRes] = await Promise.all([
        fetch("/api/alertas"),
        fetch("/api/productos?limit=500&estado=ACTIVO"),
      ]);
      const [aData, pData] = await Promise.all([alertRes.json(), prodRes.json()]);
      if (aData.success) setAlertas(aData.data || []);
      if (pData.success) setProductos(pData.data || []);
    } catch {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingAlerta(null);
    setCustomCron("");
    reset({
      tipo: "STOCK_BAJO", canales: ["EMAIL"], activa: true,
      mensaje: "", destinatarios: "", telefonos: "", productoId: "", programacion: "",
    });
    setModalOpen(true);
  };

  const openEdit = (alerta: Alerta) => {
    setEditingAlerta(alerta);
    setCustomCron("");
    reset({
      tipo: alerta.tipo as AlertaForm["tipo"],
      mensaje: alerta.mensaje,
      productoId: alerta.productoId || "",
      destinatarios: alerta.destinatarios?.join(", ") || "",
      telefonos: (alerta as any).telefonos?.join(", ") || "",
      canales: alerta.canal as AlertaForm["canales"],
      programacion: alerta.programacion || "",
      activa: alerta.activa,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: AlertaForm) => {
    const resolvedProgramacion = data.programacion === "CUSTOM" ? customCron : (data.programacion || "");
    const payload = {
      tipo: data.tipo,
      mensaje: data.mensaje,
      productoId: data.productoId || null,
      destinatarios: data.destinatarios.split(",").map((d) => d.trim()).filter(Boolean),
      telefonos: data.telefonos ? data.telefonos.split(",").map((t) => t.trim()).filter(Boolean) : [],
      canal: data.canales,
      programacion: resolvedProgramacion || null,
      activa: data.activa,
    };

    try {
      const url = editingAlerta ? `/api/alertas/${editingAlerta.id}` : "/api/alertas";
      const method = editingAlerta ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(editingAlerta ? "Alerta actualizada" : "Alerta creada");
        setModalOpen(false);
        loadData();
      } else {
        toast.error(result.error || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar la alerta");
    }
  };

  const toggleAlerta = async (alerta: Alerta) => {
    setToggling(alerta.id);
    try {
      const res = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !alerta.activa }),
      });
      if (res.ok) {
        toast.success(alerta.activa ? "Alerta pausada" : "Alerta activada");
        loadData();
      }
    } catch {
      toast.error("Error al cambiar estado");
    } finally {
      setToggling(null);
    }
  };

  const handleSendNow = async (alerta: Alerta) => {
    setSendingNow((prev) => ({ ...prev, [alerta.id]: true }));
    try {
      const res = await fetch(`/api/alertas/${alerta.id}/send`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Alerta enviada: ${data.data?.enviados || 0} mensajes`);
        loadData();
      } else {
        toast.error(data.error || "Error al enviar alerta");
      }
    } catch {
      toast.error("Error al enviar alerta");
    } finally {
      setSendingNow((prev) => ({ ...prev, [alerta.id]: false }));
    }
  };

  const deleteAlerta = async (alerta: Alerta) => {
    if (!confirm(`Eliminar alerta "${alerta.mensaje.slice(0, 40)}..."?`)) return;
    setDeleting(alerta.id);
    try {
      const res = await fetch(`/api/alertas/${alerta.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Alerta eliminada");
        loadData();
      }
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = useMemo(() =>
    alertas.filter((a) => {
      if (filtroTipo !== "TODOS" && a.tipo !== filtroTipo) return false;
      if (filtroEstado === "ACTIVAS" && !a.activa) return false;
      if (filtroEstado === "PAUSADAS" && a.activa) return false;
      if (search && !a.mensaje.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [alertas, filtroTipo, filtroEstado, search]);

  const toggleCanal = (canal: "EMAIL" | "WHATSAPP" | "NOTIFICACION_APP") => {
    const current = canales || [];
    if (current.includes(canal)) {
      setValue("canales", current.filter((c) => c !== canal));
    } else {
      setValue("canales", [...current, canal]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Bell className="h-6 w-6 text-indigo-400" />
            Alertas y Notificaciones
          </h1>
          <p className="text-sm text-white/60 mt-1">
            Programa alertas automaticas de stock, vencimientos y mas
          </p>
        </div>
        <Button onClick={openCreate} className="bg-indigo-500 hover:bg-indigo-600">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Alerta
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input placeholder="Buscar alertas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            <SelectItem value="STOCK_BAJO">Stock Bajo</SelectItem>
            <SelectItem value="VENCIMIENTO">Vencimiento</SelectItem>
            <SelectItem value="MOVIMIENTO">Movimiento</SelectItem>
            <SelectItem value="PERSONALIZADA">Personalizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="ACTIVAS">Activas</SelectItem>
            <SelectItem value="PAUSADAS">Pausadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BellRing className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-white/40 text-lg">No hay alertas configuradas</p>
            <p className="text-white/20 text-sm mt-1">Crea tu primera alerta para recibir notificaciones automaticas</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Crear Alerta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((alerta) => {
            const config = tipoAlertaConfig[alerta.tipo] || tipoAlertaConfig.PERSONALIZADA;
            const Icon = config.icon;
            const isSending = sendingNow[alerta.id];
            const isToggling = toggling === alerta.id;
            const isDeleting = deleting === alerta.id;
            return (
              <motion.div key={alerta.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className={cn("border-white/[0.04] bg-[#0a0a2a]/60 hover:border-white/[0.08] transition-all", !alerta.activa && "opacity-50")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.02]", config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2 text-white">
                            {config.label}
                            <Badge variant={alerta.activa ? "success" : "secondary"} className="text-[10px]">
                              {alerta.activa ? "Activa" : "Pausada"}
                            </Badge>
                          </CardTitle>
                          {alerta.programacion && (
                            <div className="flex items-center gap-1 text-xs text-white/40 mt-0.5">
                              <Clock className="h-3 w-3" />{alerta.programacion}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleAlerta(alerta)} title={alerta.activa ? "Pausar" : "Activar"} disabled={isToggling}>
                          {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : alerta.activa ? <Pause className="h-4 w-4 text-yellow-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(alerta)}><Pencil className="h-4 w-4 text-white/50" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteAlerta(alerta)} disabled={isDeleting}>
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-white/70">{alerta.mensaje}</p>
                    {alerta.producto && (
                      <div className="flex items-center gap-1 text-xs text-white/40"><Package className="h-3 w-3" />Producto: {alerta.producto.nombre}</div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {alerta.canal.map((c) => {
                        const cl = canalLabels[c] || canalLabels.EMAIL;
                        const CIcon = cl.icon;
                        return (
                          <Badge key={c} variant="outline" className="text-[10px] gap-1">
                            <CIcon className="h-3 w-3" />{cl.label}
                          </Badge>
                        );
                      })}
                      <span className="text-xs text-white/30">{alerta.destinatarios?.length || 0} destinatario{(alerta.destinatarios?.length || 0) !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/30">
                      <span>Creada: {formatDate(alerta.createdAt)}</span>
                      <div className="flex items-center gap-3">
                        {alerta.ultimoEnvio && <span>Ultimo: {formatRelativeTime(alerta.ultimoEnvio)}</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => handleSendNow(alerta)}
                          disabled={isSending}
                        >
                          {isSending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                          Enviar ahora
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {editingAlerta ? <><Pencil className="h-5 w-5 text-indigo-400" />Editar Alerta</> : <><Bell className="h-5 w-5 text-indigo-400" />Nueva Alerta</>}
            </DialogTitle>
            <DialogDescription>
              Configura notificaciones automaticas para mantener el control de tu inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-white">Tipo de Alerta</Label>
              <Select value={watch("tipo")} onValueChange={(v) => {
                setValue("tipo", v as AlertaForm["tipo"]);
                if (!watch("mensaje")) {
                  const defaults: Record<string, string> = {
                    STOCK_BAJO: "Stock bajo: {producto} tiene {cantidad} unidades en {bodega}",
                    VENCIMIENTO: "El producto {producto} vence proximamente",
                    MOVIMIENTO: "Movimiento de inventario detectado: {producto}",
                    PERSONALIZADA: "Notificacion personalizada de inventario",
                  };
                  setValue("mensaje", defaults[v] || "");
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_BAJO">Stock Bajo</SelectItem>
                  <SelectItem value="VENCIMIENTO">Vencimiento de Productos</SelectItem>
                  <SelectItem value="MOVIMIENTO">Movimiento de Inventario</SelectItem>
                  <SelectItem value="PERSONALIZADA">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Mensaje de la alerta</Label>
              <Input {...register("mensaje")} placeholder="Ej: El producto {producto} tiene stock bajo..." />
              {errors.mensaje && <p className="text-xs text-red-400 mt-1">{errors.mensaje.message}</p>}
              <p className="text-[10px] text-white/30 mt-1">Variables: {`{producto}`}, {`{cantidad}`}, {`{bodega}`}</p>
            </div>

            <div>
              <Label className="text-white">Producto (opcional)</Label>
              <Select value={watch("productoId") || ""} onValueChange={(v) => setValue("productoId", v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Todos los productos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los productos</SelectItem>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Destinatarios (email)</Label>
              <Input {...register("destinatarios")} placeholder="email1@ejemplo.com, email2@ejemplo.com" />
              <p className="text-xs text-white/30 mt-1">Separa multiples destinatarios con comas</p>
              {errors.destinatarios && <p className="text-xs text-red-400 mt-1">{errors.destinatarios.message}</p>}
            </div>

            <div>
              <Label className="text-white">Telefonos (WhatsApp)</Label>
              <Input {...register("telefonos")} placeholder="+50212345678, +50287654321" />
              <p className="text-xs text-white/30 mt-1">Para notificaciones por WhatsApp</p>
            </div>

            <div>
              <Label className="text-white">Canales de envio</Label>
              <div className="flex gap-3 mt-2">
                {(["EMAIL", "WHATSAPP", "NOTIFICACION_APP"] as const).map((canal) => {
                  const cl = canalLabels[canal];
                  const CIcon = cl.icon;
                  const active = (canales || []).includes(canal);
                  return (
                    <button key={canal} type="button" onClick={() => toggleCanal(canal)}
                      className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all",
                        active ? "border-indigo-500 bg-indigo-500/20 text-indigo-300" : "border-white/10 bg-white/[0.02] text-white/40 hover:border-white/20")}>
                      <CIcon className="h-4 w-4" />{cl.label}
                    </button>
                  );
                })}
              </div>
              {errors.canales && <p className="text-xs text-red-400 mt-1">{errors.canales.message}</p>}
            </div>

            <div>
              <Label className="text-white">Programacion</Label>
              <Select value={watch("programacion") || ""} onValueChange={(v) => {
                setValue("programacion", v);
                if (v !== "CUSTOM") setCustomCron("");
              }}>
                <SelectTrigger><SelectValue placeholder="Sin programacion (manual)" /></SelectTrigger>
                <SelectContent>
                  {programacionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {programacion === "CUSTOM" && (
                <Input
                  className="mt-2"
                  placeholder="Cron expression: * * * * *"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                />
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <div>
                <Label className="text-white">Alerta activa</Label>
                <p className="text-xs text-white/40">Activar o pausar notificaciones</p>
              </div>
              <Switch checked={watch("activa")} onCheckedChange={(v) => setValue("activa", v)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-500 hover:bg-indigo-600">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingAlerta ? "Actualizar Alerta" : "Crear Alerta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
