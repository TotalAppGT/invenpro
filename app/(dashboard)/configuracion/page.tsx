"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Settings,
  Building2,
  Globe,
  QrCode,
  Palette,
  Shield,
  Database,
  Bell,
  Save,
  RefreshCw,
  HardDrive,
  Users,
  Clock,
  DollarSign,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const empresaSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  nit: z.string().optional(),
  moneda: z.string().default("Q"),
  zonaHoraria: z.string().default("America/Guatemala"),
  formatoFecha: z.string().default("DD/MM/YYYY"),
});

const inventarioSchema = z.object({
  permitirStockNegativo: z.boolean().default(false),
  requerirLote: z.boolean().default(false),
  alertaStockBajo: z.boolean().default(true),
  porcentajeStockBajo: z.number().min(1).max(100).default(20),
  unidadMedidaDefault: z.string().default("unidad"),
  codigoBarrasAuto: z.boolean().default(true),
  prefijoCodigo: z.string().default("PRD-"),
  numeracionAuto: z.boolean().default(true),
  consecutivoInicial: z.number().default(1),
});

const seguridadSchema = z.object({
  sessionTimeout: z.number().min(1).max(24).default(8),
  maxIntentosLogin: z.number().min(1).max(10).default(5),
  requerir2FA: z.boolean().default(false),
  registroAuditoria: z.boolean().default(true),
  ipRestringida: z.string().optional(),
});

type EmpresaForm = z.infer<typeof empresaSchema>;
type InventarioForm = z.infer<typeof inventarioSchema>;
type SeguridadForm = z.infer<typeof seguridadSchema>;

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const empresaForm = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      moneda: "Q",
      zonaHoraria: "America/Guatemala",
      formatoFecha: "DD/MM/YYYY",
    },
  });

  const inventarioForm = useForm<InventarioForm>({
    resolver: zodResolver(inventarioSchema),
    defaultValues: {
      permitirStockNegativo: false,
      requerirLote: false,
      alertaStockBajo: true,
      porcentajeStockBajo: 20,
      unidadMedidaDefault: "unidad",
      codigoBarrasAuto: true,
      prefijoCodigo: "PRD-",
      numeracionAuto: true,
      consecutivoInicial: 1,
    },
  });

  const seguridadForm = useForm<SeguridadForm>({
    resolver: zodResolver(seguridadSchema),
    defaultValues: {
      sessionTimeout: 8,
      maxIntentosLogin: 5,
      requerir2FA: false,
      registroAuditoria: true,
    },
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/tenant");
      const data = await res.json();
      if (data.success && data.data?.config) {
        const c = data.data.config;
        if (c.empresa) empresaForm.reset(c.empresa);
        if (c.inventario) inventarioForm.reset(c.inventario);
        if (c.seguridad) seguridadForm.reset(c.seguridad);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const config: Record<string, unknown> = {};
      if (section === "empresa") config.empresa = empresaForm.getValues();
      if (section === "inventario") config.inventario = inventarioForm.getValues();
      if (section === "seguridad") config.seguridad = seguridadForm.getValues();

      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configuración guardada exitosamente");
      } else {
        toast.error(data.message || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configuración del Sistema</h1>
          <p className="text-sm text-white/60">
            Personaliza tu sistema de inventario según las necesidades de tu empresa
          </p>
        </div>
      </div>

      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="w-full max-w-2xl grid grid-cols-4">
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="inventario" className="gap-2">
            <Database className="h-4 w-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-2">
            <Shield className="h-4 w-4" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-6">
          <form onSubmit={empresaForm.handleSubmit(() => handleSave("empresa"))} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-white/10 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-400" />
                    Información de la Empresa
                  </CardTitle>
                  <CardDescription>
                    Datos que aparecerán en reportes, documentos y facturación
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>Nombre de la Empresa</Label>
                    <Input {...empresaForm.register("nombre")} placeholder="Nombre comercial" />
                  </div>
                  <div>
                    <Label>NIT</Label>
                    <Input {...empresaForm.register("nit")} placeholder="NIT-123456" />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input {...empresaForm.register("telefono")} placeholder="+502 XXXX XXXX" />
                  </div>
                  <div>
                    <Label>Email Corporativo</Label>
                    <Input {...empresaForm.register("email")} placeholder="contacto@empresa.com" type="email" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección</Label>
                    <Input {...empresaForm.register("direccion")} placeholder="Dirección fiscal" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    Moneda y Formato
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Moneda Principal</Label>
                    <Select
                      value={empresaForm.watch("moneda")}
                      onValueChange={(v) => empresaForm.setValue("moneda", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Q">Quetzal (Q) - Guatemala</SelectItem>
                        <SelectItem value="$">Dólar ($) - USD</SelectItem>
                        <SelectItem value="€">Euro (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Zona Horaria</Label>
                    <Select
                      value={empresaForm.watch("zonaHoraria")}
                      onValueChange={(v) => empresaForm.setValue("zonaHoraria", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Guatemala">Guatemala (GMT-6)</SelectItem>
                        <SelectItem value="America/Mexico_City">México (GMT-6)</SelectItem>
                        <SelectItem value="America/El_Salvador">El Salvador (GMT-6)</SelectItem>
                        <SelectItem value="America/Costa_Rica">Costa Rica (GMT-6)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Formato de Fecha</Label>
                    <Select
                      value={empresaForm.watch("formatoFecha")}
                      onValueChange={(v) => empresaForm.setValue("formatoFecha", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-400" />
                    Regional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="success">Activo</Badge>
                      <span className="text-sm text-white/80">Guatemala</span>
                    </div>
                    <p className="text-xs text-white/50">
                      Impuestos, regulaciones y formatos adaptados a la normativa guatemalteca.
                      IVA 12% incluido en precios cuando corresponda.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Símbolo de moneda</span>
                      <span className="text-white font-mono">Q</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Separador decimal</span>
                      <span className="text-white font-mono">.</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Separador de miles</span>
                      <span className="text-white font-mono">,</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="inventario" className="mt-6">
          <form
            onSubmit={inventarioForm.handleSubmit(() => handleSave("inventario"))}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-cyan-400" />
                    Parámetros de Inventario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir Stock Negativo</Label>
                      <p className="text-xs text-white/40">Permite que el inventario baje de cero</p>
                    </div>
                    <Switch
                      checked={inventarioForm.watch("permitirStockNegativo")}
                      onCheckedChange={(v) => inventarioForm.setValue("permitirStockNegativo", v)}
                    />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requerir Número de Lote</Label>
                      <p className="text-xs text-white/40">Obliga a ingresar lote en movimientos</p>
                    </div>
                    <Switch
                      checked={inventarioForm.watch("requerirLote")}
                      onCheckedChange={(v) => inventarioForm.setValue("requerirLote", v)}
                    />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alertas de Stock Bajo</Label>
                      <p className="text-xs text-white/40">Activar notificaciones automáticas</p>
                    </div>
                    <Switch
                      checked={inventarioForm.watch("alertaStockBajo")}
                      onCheckedChange={(v) => inventarioForm.setValue("alertaStockBajo", v)}
                    />
                  </div>
                  {inventarioForm.watch("alertaStockBajo") && (
                    <div>
                      <Label>Umbral de Alerta (%)</Label>
                      <Input
                        type="number"
                        {...inventarioForm.register("porcentajeStockBajo", { valueAsNumber: true })}
                      />
                      <p className="text-xs text-white/40 mt-1">
                        Se alerta cuando el stock está al {inventarioForm.watch("porcentajeStockBajo")}% del mínimo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-violet-400" />
                    Códigos y Numeración
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Unidad de Medida por Defecto</Label>
                    <Select
                      value={inventarioForm.watch("unidadMedidaDefault")}
                      onValueChange={(v) => inventarioForm.setValue("unidadMedidaDefault", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unidad">Unidad</SelectItem>
                        <SelectItem value="kg">Kilogramo</SelectItem>
                        <SelectItem value="litro">Litro</SelectItem>
                        <SelectItem value="metro">Metro</SelectItem>
                        <SelectItem value="caja">Caja</SelectItem>
                        <SelectItem value="resma">Resma</SelectItem>
                        <SelectItem value="par">Par</SelectItem>
                        <SelectItem value="docena">Docena</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-generar Código de Barras</Label>
                      <p className="text-xs text-white/40">Genera código de barras al crear productos</p>
                    </div>
                    <Switch
                      checked={inventarioForm.watch("codigoBarrasAuto")}
                      onCheckedChange={(v) => inventarioForm.setValue("codigoBarrasAuto", v)}
                    />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Numeración Automática</Label>
                      <p className="text-xs text-white/40">Auto-incrementa el código de productos</p>
                    </div>
                    <Switch
                      checked={inventarioForm.watch("numeracionAuto")}
                      onCheckedChange={(v) => inventarioForm.setValue("numeracionAuto", v)}
                    />
                  </div>
                  {inventarioForm.watch("numeracionAuto") && (
                    <>
                      <div>
                        <Label>Prefijo de Código</Label>
                        <Input {...inventarioForm.register("prefijoCodigo")} />
                      </div>
                      <div>
                        <Label>Consecutivo Inicial</Label>
                        <Input
                          type="number"
                          {...inventarioForm.register("consecutivoInicial", { valueAsNumber: true })}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="seguridad" className="mt-6">
          <form
            onSubmit={seguridadForm.handleSubmit(() => handleSave("seguridad"))}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-400" />
                    Sesiones y Acceso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Tiempo de Sesión (horas)</Label>
                    <Input
                      type="number"
                      {...seguridadForm.register("sessionTimeout", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Los usuarios serán desconectados tras este tiempo de inactividad
                    </p>
                  </div>
                  <Separator className="bg-white/10" />
                  <div>
                    <Label>Máximos Intentos de Login</Label>
                    <Input
                      type="number"
                      {...seguridadForm.register("maxIntentosLogin", { valueAsNumber: true })}
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Bloqueo temporal tras exceder este límite
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-yellow-400" />
                    Auditoría y Registro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Registro de Auditoría</Label>
                      <p className="text-xs text-white/40">
                        Registra todas las acciones de usuarios en el sistema
                      </p>
                    </div>
                    <Switch
                      checked={seguridadForm.watch("registroAuditoria")}
                      onCheckedChange={(v) => seguridadForm.setValue("registroAuditoria", v)}
                    />
                  </div>
                  <Separator className="bg-white/10" />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Autenticación de Dos Factores</Label>
                      <p className="text-xs text-white/40">Requiere código adicional para iniciar sesión</p>
                    </div>
                    <Switch
                      checked={seguridadForm.watch("requerir2FA")}
                      onCheckedChange={(v) => seguridadForm.setValue("requerir2FA", v)}
                    />
                  </div>
                  <Separator className="bg-white/10" />
                  <div>
                    <Label>IP Restringida (opcional)</Label>
                    <Input
                      {...seguridadForm.register("ipRestringida")}
                      placeholder="192.168.1.0/24"
                    />
                    <p className="text-xs text-white/40 mt-1">
                      Limita el acceso solo desde esta IP o rango
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="sistema" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                  Información del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Versión", value: "3.0.0", icon: Settings },
                    { label: "Plan Actual", value: "Profesional", icon: Building2 },
                    { label: "Base de Datos", value: "PostgreSQL (Railway)", icon: Database },
                    { label: "Almacenamiento", value: "Firebase Storage", icon: HardDrive },
                    { label: "Email Service", value: "Resend", icon: Bell },
                    { label: "Pasarela de Pago", value: "Recurrente", icon: DollarSign },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/60">{item.label}</span>
                      </div>
                      <span className="text-sm text-white font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-400" />
                  Límites del Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: "Usuarios", usado: 2, total: 10, icon: Users },
                    { label: "Bodegas", usado: 3, total: 10, icon: Building2 },
                    { label: "Productos", usado: 156, total: 5000, icon: Package },
                    { label: "Movimientos/mes", usado: 423, total: "∞", icon: RefreshCw },
                  ].map((item) => {
                    const pct = typeof item.total === "number" ? (item.usado / item.total) * 100 : 5;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <item.icon className="h-4 w-4 text-white/40" />
                            <span className="text-white/60">{item.label}</span>
                          </div>
                          <span className="text-white font-mono text-xs">
                            {item.usado} / {item.total}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct > 80 ? "bg-red-500" : pct > 60 ? "bg-yellow-500" : "bg-indigo-500"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-6"
                  onClick={() => (window.location.href = "/suscripcion")}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Administrar Plan
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-400" />
                  Zona de Peligro
                </CardTitle>
                <CardDescription>
                  Estas acciones son irreversibles. Procede con precaución.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div>
                    <p className="text-sm font-medium text-red-400">Eliminar todos los datos de prueba</p>
                    <p className="text-xs text-white/40">
                      Elimina productos, movimientos e inventario marcados como prueba
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Limpiar Datos
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div>
                    <p className="text-sm font-medium text-red-400">Reiniciar inventario</p>
                    <p className="text-xs text-white/40">
                      Pone todas las cantidades de inventario en cero. Los movimientos se conservan.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Reiniciar
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                  <div>
                    <p className="text-sm font-medium text-red-400">Eliminar empresa</p>
                    <p className="text-xs text-white/40">
                      Elimina permanentemente todos los datos de tu empresa. Esta acción no se puede deshacer.
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Eliminar Todo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

import { Package } from "lucide-react";
