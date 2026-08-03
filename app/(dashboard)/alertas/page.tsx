"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Bell,
  BellRing,
  Plus,
  Pencil,
  Trash2,
  Mail,
  MessageCircle,
  Smartphone,
  Clock,
  AlertTriangle,
  CalendarClock,
  Package,
  Megaphone,
  Play,
  Pause,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatDate, formatRelativeDate, cn } from "@/lib/utils";

const alertaSchema = z.object({
  tipo: z.enum(["STOCK_BAJO", "VENCIMIENTO", "MOVIMIENTO", "PERSONALIZADA"]),
  mensaje: z.string().min(3, "Mínimo 3 caracteres"),
  productoId: z.string().optional(),
  destinatarios: z.string().min(1, "Al menos un destinatario"),
  canales: z.array(z.enum(["EMAIL", "WHATSAPP", "NOTIFICACION_APP"])).min(1),
  programacion: z.string().optional(),
  activa: z.boolean().default(true),
});

type AlertaForm = z.infer<typeof alertaSchema>;

interface Alerta {
  id: string;
  tipo: string;
  mensaje: string;
  producto?: { nombre: string } | null;
  destinatarios: string[];
  canal: string[];
  programacion: string | null;
  activa: boolean;
  ultimoEnvio: string | null;
  createdAt: string;
}

const tipoAlertaConfig: Record<
  string,
  { label: string; icon: typeof Bell; color: string }
> = {
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

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlerta, setEditingAlerta] = useState<Alerta | null>(null);
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AlertaForm>({
    resolver: zodResolver(alertaSchema),
    defaultValues: { tipo: "STOCK_BAJO", canales: ["EMAIL"], activa: true },
  });

  const canales = watch("canales");

  const loadAlertas = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/alertas");
      const data = await res.json();
      if (data.success) setAlertas(data.data);
    } catch {
      toast.error("Error al cargar alertas");
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    loadAlertas();
  });

  const openCreate = () => {
    setEditingAlerta(null);
    reset({ tipo: "STOCK_BAJO", canales: ["EMAIL"], activa: true, mensaje: "", destinatarios: "" });
    setModalOpen(true);
  };

  const openEdit = (alerta: Alerta) => {
    setEditingAlerta(alerta);
    reset({
      tipo: alerta.tipo as AlertaForm["tipo"],
      mensaje: alerta.mensaje,
      productoId: undefined,
      destinatarios: alerta.destinatarios.join(", "),
      canales: alerta.canal as AlertaForm["canales"],
      programacion: alerta.programacion || "",
      activa: alerta.activa,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data: AlertaForm) => {
    const payload = {
      ...data,
      destinatarios: data.destinatarios.split(",").map((d) => d.trim()),
    };
    try {
      const url = editingAlerta
        ? `/api/alertas/${editingAlerta.id}`
        : "/api/alertas";
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
        loadAlertas();
      } else {
        toast.error(result.message || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar la alerta");
    }
  };

  const toggleAlerta = async (alerta: Alerta) => {
    try {
      const res = await fetch(`/api/alertas/${alerta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: !alerta.activa }),
      });
      if (res.ok) {
        toast.success(alerta.activa ? "Alerta pausada" : "Alerta activada");
        loadAlertas();
      }
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const deleteAlerta = async (id: string) => {
    if (!confirm("¿Eliminar esta alerta?")) return;
    try {
      const res = await fetch(`/api/alertas/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Alerta eliminada");
        loadAlertas();
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const triggerCheck = async () => {
    try {
      const res = await fetch("/api/alertas/check", { method: "POST" });
      const data = await res.json();
      toast.success(`Revisión completada: ${data.data?.enviadas || 0} alertas enviadas`);
    } catch {
      toast.error("Error al ejecutar verificación");
    }
  };

  const filtered = alertas.filter((a) => {
    if (filtroTipo !== "TODOS" && a.tipo !== filtroTipo) return false;
    if (filtroEstado === "ACTIVAS" && !a.activa) return false;
    if (filtroEstado === "PAUSADAS" && a.activa) return false;
    if (search && !a.mensaje.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleCanal = (canal: "EMAIL" | "WHATSAPP" | "NOTIFICACION_APP") => {
    const current = canales || [];
    if (current.includes(canal)) {
      setValue(
        "canales",
        current.filter((c) => c !== canal)
      );
    } else {
      setValue("canales", [...current, canal]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Alertas y Notificaciones</h1>
          <p className="text-sm text-white/60">Programa alertas automáticas de stock, vencimientos y más</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={triggerCheck}>
            <Play className="mr-2 h-4 w-4" />
            Ejecutar verificación
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Alerta
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Buscar alertas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los tipos</SelectItem>
            <SelectItem value="STOCK_BAJO">Stock Bajo</SelectItem>
            <SelectItem value="VENCIMIENTO">Vencimiento</SelectItem>
            <SelectItem value="MOVIMIENTO">Movimiento</SelectItem>
            <SelectItem value="PERSONALIZADA">Personalizada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="ACTIVAS">Activas</SelectItem>
            <SelectItem value="PAUSADAS">Pausadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BellRing className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-white/60 text-lg">No hay alertas configuradas</p>
            <p className="text-white/40 text-sm mt-1">
              Crea tu primera alerta para recibir notificaciones automáticas
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Crear Alerta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((alerta) => {
            const config = tipoAlertaConfig[alerta.tipo] || tipoAlertaConfig.PERSONALIZADA;
            const Icon = config.icon;
            return (
              <motion.div
                key={alerta.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card
                  className={cn(
                    "border-white/10 hover:border-white/20 transition-all",
                    !alerta.activa && "opacity-60"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            "bg-white/5",
                            config.color
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {config.label}
                            <Badge
                              variant={alerta.activa ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {alerta.activa ? "Activa" : "Pausada"}
                            </Badge>
                          </CardTitle>
                          {alerta.programacion && (
                            <div className="flex items-center gap-1 text-xs text-white/50 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {alerta.programacion}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAlerta(alerta)}
                          title={alerta.activa ? "Pausar" : "Activar"}
                        >
                          {alerta.activa ? (
                            <Pause className="h-4 w-4 text-yellow-400" />
                          ) : (
                            <Play className="h-4 w-4 text-green-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(alerta)}
                        >
                          <Pencil className="h-4 w-4 text-white/60" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAlerta(alerta.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-white/80">{alerta.mensaje}</p>
                    {alerta.producto && (
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Package className="h-3 w-3" />
                        Producto: {alerta.producto.nombre}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {alerta.canal.map((c) => {
                        const cl = canalLabels[c] || canalLabels.EMAIL;
                        const CIcon = cl.icon;
                        return (
                          <Badge key={c} variant="outline" className="text-xs gap-1">
                            <CIcon className="h-3 w-3" />
                            {cl.label}
                          </Badge>
                        );
                      })}
                      <span className="text-xs text-white/40">
                        {alerta.destinatarios.length} destinatario
                        {alerta.destinatarios.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>Creada: {formatDate(alerta.createdAt)}</span>
                      {alerta.ultimoEnvio && (
                        <span>Último envío: {formatRelativeDate(alerta.ultimoEnvio)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAlerta ? "Editar Alerta" : "Nueva Alerta"}</DialogTitle>
            <DialogDescription>
              Configura notificaciones automáticas para mantener el control de tu inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Tipo de Alerta</Label>
              <Select
                value={watch("tipo")}
                onValueChange={(v) => setValue("tipo", v as AlertaForm["tipo"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STOCK_BAJO">Stock Bajo</SelectItem>
                  <SelectItem value="VENCIMIENTO">Vencimiento de Productos</SelectItem>
                  <SelectItem value="MOVIMIENTO">Movimiento de Inventario</SelectItem>
                  <SelectItem value="PERSONALIZADA">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mensaje de la alerta</Label>
              <Input {...register("mensaje")} placeholder="Ej: El producto X tiene stock bajo..." />
              {errors.mensaje && (
                <p className="text-xs text-red-400 mt-1">{errors.mensaje.message}</p>
              )}
            </div>

            <div>
              <Label>Destinatarios</Label>
              <Input
                {...register("destinatarios")}
                placeholder="email1@ejemplo.com, email2@ejemplo.com"
              />
              <p className="text-xs text-white/40 mt-1">
                Separa múltiples destinatarios con comas
              </p>
              {errors.destinatarios && (
                <p className="text-xs text-red-400 mt-1">{errors.destinatarios.message}</p>
              )}
            </div>

            <div>
              <Label>Canales de envío</Label>
              <div className="flex gap-3 mt-2">
                {(["EMAIL", "WHATSAPP", "NOTIFICACION_APP"] as const).map(
                  (canal) => {
                    const cl = canalLabels[canal];
                    const CIcon = cl.icon;
                    const active = (canales || []).includes(canal);
                    return (
                      <button
                        key={canal}
                        type="button"
                        onClick={() => toggleCanal(canal)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all",
                          active
                            ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                            : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
                        )}
                      >
                        <CIcon className="h-4 w-4" />
                        {cl.label}
                      </button>
                    );
                  }
                )}
              </div>
              {errors.canales && (
                <p className="text-xs text-red-400 mt-1">{errors.canales.message}</p>
              )}
            </div>

            <div>
              <Label>Programación (opcional)</Label>
              <Select
                value={watch("programacion") || ""}
                onValueChange={(v) => setValue("programacion", v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin programación (manual)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin programación</SelectItem>
                  <SelectItem value="0 */6 * * *">Cada 6 horas</SelectItem>
                  <SelectItem value="0 8 * * *">Diario 8:00 AM</SelectItem>
                  <SelectItem value="0 8 * * 1">Cada lunes 8:00 AM</SelectItem>
                  <SelectItem value="0 8 1 * *">Primer día del mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={watch("activa")}
                  onCheckedChange={(v) => setValue("activa", v)}
                />
                <Label>Alerta activa</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : editingAlerta
                  ? "Actualizar Alerta"
                  : "Crear Alerta"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
