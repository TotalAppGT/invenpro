"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
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
  Loader2,
  Phone,
  Hash,
  Mail,
  Webhook,
  AlertTriangle,
  Send,
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

interface EmpresaConfig {
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  email: string;
  website: string;
  moneda: string;
  zonaHoraria: string;
  formatoFecha: string;
}

interface InventarioConfig {
  codigoBarrasAuto: boolean;
  prefijoCodigo: string;
  numeracionAuto: boolean;
  consecutivoInicial: number;
  porcentajeStockBajo: number;
  alertaStockBajo: boolean;
  unidadMedidaDefault: string;
  permitirStockNegativo: boolean;
  requerirLote: boolean;
}

interface CodigosInternosConfig {
  patronCodigo: string;
  consecutivoActual: number;
}

interface NotificacionesConfig {
  emailAlertas: string;
  whatsappAlertas: string;
  emailNotificaciones: boolean;
  whatsappNotificaciones: boolean;
  frecuenciaAlertas: "diario" | "semanal" | "tiempo_real";
}

interface TenantFullConfig {
  empresa?: EmpresaConfig;
  inventario?: InventarioConfig;
  codigosInternos?: CodigosInternosConfig;
  notificaciones?: NotificacionesConfig;
  [key: string]: unknown;
}

const DEFAULT_EMPRESA: EmpresaConfig = {
  nombre: "",
  nit: "",
  direccion: "",
  telefono: "",
  email: "",
  website: "",
  moneda: "Q",
  zonaHoraria: "America/Guatemala",
  formatoFecha: "DD/MM/YYYY",
};

const DEFAULT_INVENTARIO: InventarioConfig = {
  codigoBarrasAuto: true,
  prefijoCodigo: "PRD-",
  numeracionAuto: true,
  consecutivoInicial: 1,
  porcentajeStockBajo: 20,
  alertaStockBajo: true,
  unidadMedidaDefault: "unidad",
  permitirStockNegativo: false,
  requerirLote: false,
};

const DEFAULT_CODIGOS: CodigosInternosConfig = {
  patronCodigo: "{PREFIJO}{CONSECUTIVO}",
  consecutivoActual: 1,
};

const DEFAULT_NOTIFICACIONES: NotificacionesConfig = {
  emailAlertas: "",
  whatsappAlertas: "",
  emailNotificaciones: true,
  whatsappNotificaciones: false,
  frecuenciaAlertas: "diario",
};

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<{
    version: string;
    plan: string;
    planLimits: { maxBodegas: number; maxProductos: number; maxUsers: number; maxMovimientos: number };
    usage: Record<string, { used: number; limit: number }>;
  } | null>(null);

  const [empresa, setEmpresa] = useState<EmpresaConfig>({ ...DEFAULT_EMPRESA });
  const [inventario, setInventario] = useState<InventarioConfig>({ ...DEFAULT_INVENTARIO });
  const [codigosInternos, setCodigosInternos] = useState<CodigosInternosConfig>({ ...DEFAULT_CODIGOS });
  const [notificaciones, setNotificaciones] = useState<NotificacionesConfig>({ ...DEFAULT_NOTIFICACIONES });

  const [codigoPreview, setCodigoPreview] = useState("");

  const generateCodePreview = useCallback(() => {
    const patron = codigosInternos.patronCodigo;
    const now = new Date();
    const preview = patron
      .replace(/\{PREFIJO\}/g, inventario.prefijoCodigo)
      .replace(/\{CONSECUTIVO\}/g, String(codigosInternos.consecutivoActual).padStart(6, "0"))
      .replace(/\{CATEGORIA\}/g, "CAT")
      .replace(/\{AÑO\}/g, String(now.getFullYear()))
      .replace(/\{año\}/g, String(now.getFullYear()).slice(2))
      .replace(/\{MES\}/g, String(now.getMonth() + 1).padStart(2, "0"))
      .replace(/\{mes\}/g, String(now.getMonth() + 1).padStart(2, "0"));
    setCodigoPreview(preview);
  }, [codigosInternos.patronCodigo, codigosInternos.consecutivoActual, inventario.prefijoCodigo]);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (!loading) {
      generateCodePreview();
    }
  }, [loading, codigosInternos.patronCodigo, codigosInternos.consecutivoActual, inventario.prefijoCodigo, generateCodePreview]);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/tenant");
      const data = await res.json();
      if (data.success && data.data) {
        const fullConfig: TenantFullConfig = data.data.config || {};
        if (fullConfig.empresa) setEmpresa({ ...DEFAULT_EMPRESA, ...fullConfig.empresa });
        if (fullConfig.inventario) setInventario({ ...DEFAULT_INVENTARIO, ...fullConfig.inventario });
        if (fullConfig.codigosInternos) setCodigosInternos({ ...DEFAULT_CODIGOS, ...fullConfig.codigosInternos });
        if (fullConfig.notificaciones) setNotificaciones({ ...DEFAULT_NOTIFICACIONES, ...fullConfig.notificaciones });
        setTenantInfo({
          version: "3.0.0",
          plan: data.data.plan || "EMPRENDEDOR",
          planLimits: data.data.limits || { maxBodegas: 2, maxProductos: 500, maxUsers: 3, maxMovimientos: 1000 },
          usage: data.data.usage || {},
        });
      }
    } catch {
      console.warn("Error loading tenant config, using defaults");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (section: string) => {
    setSaving(section);
    try {
      const configPayload: Record<string, unknown> = {};
      if (section === "empresa") configPayload.empresa = empresa;
      if (section === "inventario") configPayload.inventario = inventario;
      if (section === "codigosInternos") configPayload.codigosInternos = codigosInternos;
      if (section === "notificaciones") configPayload.notificaciones = notificaciones;

      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configPayload }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configuración guardada exitosamente");
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(null);
    }
  };

  const handleTestNotification = async () => {
    if (!notificaciones.emailAlertas && !notificaciones.whatsappAlertas) {
      toast.error("Configure al menos un email o número de WhatsApp para probar");
      return;
    }
    setTestingNotification(true);
    try {
      const res = await fetch("/api/notificaciones/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: notificaciones.emailAlertas,
          whatsapp: notificaciones.whatsappAlertas,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Notificación de prueba enviada correctamente");
      } else {
        toast.error(data.error || "Error al enviar notificación de prueba");
      }
    } catch {
      toast.error("Error de conexión al enviar notificación de prueba");
    } finally {
      setTestingNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="cosmic-bg min-h-screen">
        <div className="cosmic-grid" />
        <div className="relative z-10 space-y-6 p-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="cosmic-bg min-h-screen"
    >
      <div className="cosmic-grid" />
      <div className="relative z-10 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuración del Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Personaliza tu sistema de inventario según las necesidades de tu empresa
            </p>
          </div>
        </div>

        <Tabs defaultValue="empresa" className="w-full">
          <TabsList className="w-full max-w-3xl grid grid-cols-5">
            <TabsTrigger value="empresa" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="inventario" className="gap-2">
              <Database className="h-4 w-4" />
              Inventario
            </TabsTrigger>
            <TabsTrigger value="codigos" className="gap-2">
              <Hash className="h-4 w-4" />
              Códigos
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="gap-2">
              <Bell className="h-4 w-4" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="sistema" className="gap-2">
              <Settings className="h-4 w-4" />
              Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-white/10 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-indigo-400" />
                      Información de la Empresa
                    </CardTitle>
                    <CardDescription>
                      Datos que aparecerán en reportes, documentos y etiquetas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label>Nombre de la Empresa</Label>
                      <Input
                        value={empresa.nombre}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre comercial"
                      />
                    </div>
                    <div>
                      <Label>NIT</Label>
                      <Input
                        value={empresa.nit}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, nit: e.target.value }))}
                        placeholder="NIT-123456"
                      />
                    </div>
                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={empresa.telefono}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+502 XXXX XXXX"
                      />
                    </div>
                    <div>
                      <Label>Email Corporativo</Label>
                      <Input
                        value={empresa.email}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="contacto@empresa.com"
                        type="email"
                      />
                    </div>
                    <div>
                      <Label>Sitio Web</Label>
                      <Input
                        value={empresa.website}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, website: e.target.value }))}
                        placeholder="www.empresa.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Dirección</Label>
                      <Input
                        value={empresa.direccion}
                        onChange={(e) => setEmpresa((prev) => ({ ...prev, direccion: e.target.value }))}
                        placeholder="Dirección fiscal"
                      />
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
                      <Select value={empresa.moneda} onValueChange={(v) => setEmpresa((prev) => ({ ...prev, moneda: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q">Quetzal (Q) - Guatemala</SelectItem>
                          <SelectItem value="$">Dólar ($) - USD</SelectItem>
                          <SelectItem value="€">Euro (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Zona Horaria</Label>
                      <Select value={empresa.zonaHoraria} onValueChange={(v) => setEmpresa((prev) => ({ ...prev, zonaHoraria: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <Select value={empresa.formatoFecha} onValueChange={(v) => setEmpresa((prev) => ({ ...prev, formatoFecha: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                        <Badge variant="secondary">Activo</Badge>
                        <span className="text-sm text-foreground">Guatemala</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Impuestos, regulaciones y formatos adaptados a la normativa guatemalteca.
                        IVA 12% incluido en precios cuando corresponda.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Símbolo de moneda</span>
                        <span className="font-mono">{empresa.moneda}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Separador decimal</span>
                        <span className="font-mono">.</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Separador de miles</span>
                        <span className="font-mono">,</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("empresa")} disabled={saving === "empresa"}>
                  {saving === "empresa" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving === "empresa" ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventario" className="mt-6">
            <div className="space-y-6">
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
                        <p className="text-xs text-muted-foreground">Permite que el inventario baje de cero</p>
                      </div>
                      <Switch
                        checked={inventario.permitirStockNegativo}
                        onCheckedChange={(v) => setInventario((prev) => ({ ...prev, permitirStockNegativo: v }))}
                      />
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Alertas de Stock Bajo</Label>
                        <p className="text-xs text-muted-foreground">Activar notificaciones automáticas</p>
                      </div>
                      <Switch
                        checked={inventario.alertaStockBajo}
                        onCheckedChange={(v) => setInventario((prev) => ({ ...prev, alertaStockBajo: v }))}
                      />
                    </div>
                    {inventario.alertaStockBajo && (
                      <div>
                        <Label>Umbral de Alerta (%)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={inventario.porcentajeStockBajo}
                          onChange={(e) => setInventario((prev) => ({ ...prev, porcentajeStockBajo: parseInt(e.target.value) || 20 }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Se alerta cuando el stock está al {inventario.porcentajeStockBajo}% del mínimo
                        </p>
                      </div>
                    )}
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Requerir Número de Lote</Label>
                        <p className="text-xs text-muted-foreground">Obliga a ingresar lote en movimientos</p>
                      </div>
                      <Switch
                        checked={inventario.requerirLote}
                        onCheckedChange={(v) => setInventario((prev) => ({ ...prev, requerirLote: v }))}
                      />
                    </div>
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
                        value={inventario.unidadMedidaDefault}
                        onValueChange={(v) => setInventario((prev) => ({ ...prev, unidadMedidaDefault: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                        <p className="text-xs text-muted-foreground">Genera código de barras al crear productos</p>
                      </div>
                      <Switch
                        checked={inventario.codigoBarrasAuto}
                        onCheckedChange={(v) => setInventario((prev) => ({ ...prev, codigoBarrasAuto: v }))}
                      />
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Numeración Automática</Label>
                        <p className="text-xs text-muted-foreground">Auto-incrementa el código de productos</p>
                      </div>
                      <Switch
                        checked={inventario.numeracionAuto}
                        onCheckedChange={(v) => setInventario((prev) => ({ ...prev, numeracionAuto: v }))}
                      />
                    </div>
                    {inventario.numeracionAuto && (
                      <>
                        <div>
                          <Label>Prefijo de Código</Label>
                          <Input
                            value={inventario.prefijoCodigo}
                            onChange={(e) => setInventario((prev) => ({ ...prev, prefijoCodigo: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Consecutivo Inicial</Label>
                          <Input
                            type="number"
                            min={1}
                            value={inventario.consecutivoInicial}
                            onChange={(e) => setInventario((prev) => ({ ...prev, consecutivoInicial: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("inventario")} disabled={saving === "inventario"}>
                  {saving === "inventario" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving === "inventario" ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="codigos" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hash className="h-5 w-5 text-yellow-400" />
                      Plantilla de Códigos Internos
                    </CardTitle>
                    <CardDescription>
                      Define el formato de los códigos generados automáticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Patrón de Código</Label>
                      <Input
                        value={codigosInternos.patronCodigo}
                        onChange={(e) => setCodigosInternos((prev) => ({ ...prev, patronCodigo: e.target.value }))}
                        placeholder="{PREFIJO}{CONSECUTIVO}"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Usa variables: {"{PREFIJO}"}, {"{CONSECUTIVO}"}, {"{CATEGORIA}"}, {"{AÑO}"}, {"{MES}"}
                      </p>
                    </div>

                    <div>
                      <Label>Vista Previa</Label>
                      <div className="mt-1 rounded-md border border-white/10 bg-muted/30 p-3">
                        <span className="font-mono text-lg text-primary">{codigoPreview || "—"}</span>
                      </div>
                    </div>

                    <Separator className="bg-white/10" />

                    <div>
                      <Label>Variables Disponibles</Label>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {[
                          { variable: "{PREFIJO}", desc: "Prefijo configurado en Inventario" },
                          { variable: "{CONSECUTIVO}", desc: "Número consecutivo actual" },
                          { variable: "{CATEGORIA}", desc: "Código de categoría del producto" },
                          { variable: "{AÑO}", desc: "Año actual (4 dígitos)" },
                          { variable: "{MES}", desc: "Mes actual (2 dígitos)" },
                        ].map((v) => (
                          <div key={v.variable} className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5 text-sm">
                            <code className="text-xs text-primary">{v.variable}</code>
                            <span className="text-muted-foreground">{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5 text-green-400" />
                      Control de Consecutivo
                    </CardTitle>
                    <CardDescription>
                      Administra la numeración automática de productos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-white/5 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Consecutivo Actual</p>
                      <p className="text-3xl font-bold font-mono text-primary">
                        {String(codigosInternos.consecutivoActual).padStart(6, "0")}
                      </p>
                    </div>

                    <div>
                      <Label>Nuevo Valor de Consecutivo</Label>
                      <Input
                        type="number"
                        min={1}
                        value={codigosInternos.consecutivoActual}
                        onChange={(e) => setCodigosInternos((prev) => ({ ...prev, consecutivoActual: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setCodigosInternos((prev) => ({ ...prev, consecutivoActual: 1 }));
                        toast.success("Consecutivo reiniciado a 1");
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Restablecer Consecutivo
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("codigosInternos")} disabled={saving === "codigosInternos"}>
                  {saving === "codigosInternos" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving === "codigosInternos" ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notificaciones" className="mt-6">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-400" />
                      Configuración de Email
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Email para Alertas</Label>
                      <Input
                        type="email"
                        value={notificaciones.emailAlertas}
                        onChange={(e) => setNotificaciones((prev) => ({ ...prev, emailAlertas: e.target.value }))}
                        placeholder="alertas@empresa.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email donde se enviarán las notificaciones automáticas
                      </p>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notificaciones por Email</Label>
                        <p className="text-xs text-muted-foreground">Habilitar envío de alertas por correo electrónico</p>
                      </div>
                      <Switch
                        checked={notificaciones.emailNotificaciones}
                        onCheckedChange={(v) => setNotificaciones((prev) => ({ ...prev, emailNotificaciones: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-400" />
                      Configuración de WhatsApp
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Número WhatsApp para Alertas</Label>
                      <Input
                        value={notificaciones.whatsappAlertas}
                        onChange={(e) => setNotificaciones((prev) => ({ ...prev, whatsappAlertas: e.target.value }))}
                        placeholder="+502 XXXX XXXX"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Número con código de país (ej: +50212345678)
                      </p>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notificaciones por WhatsApp</Label>
                        <p className="text-xs text-muted-foreground">Habilitar envío de alertas por WhatsApp Business</p>
                      </div>
                      <Switch
                        checked={notificaciones.whatsappNotificaciones}
                        onCheckedChange={(v) => setNotificaciones((prev) => ({ ...prev, whatsappNotificaciones: v }))}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-400" />
                      Frecuencia de Alertas
                    </CardTitle>
                    <CardDescription>
                      Define cada cuánto se enviarán las notificaciones automáticas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Frecuencia</Label>
                      <Select
                        value={notificaciones.frecuenciaAlertas}
                        onValueChange={(v) => setNotificaciones((prev) => ({ ...prev, frecuenciaAlertas: v as NotificacionesConfig["frecuenciaAlertas"] }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diario - Una vez al día</SelectItem>
                          <SelectItem value="semanal">Semanal - Resumen cada lunes</SelectItem>
                          <SelectItem value="tiempo_real">Tiempo Real - Inmediato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-white/10 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-purple-400" />
                      Probar Notificaciones
                    </CardTitle>
                    <CardDescription>
                      Envía una notificación de prueba para verificar la configuración
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Enviar notificación de prueba</p>
                        <p className="text-xs text-muted-foreground">
                          Se enviará un mensaje de prueba a los canales configurados
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleTestNotification}
                        disabled={testingNotification}
                      >
                        {testingNotification ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        {testingNotification ? "Enviando..." : "Probar Ahora"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("notificaciones")} disabled={saving === "notificaciones"}>
                  {saving === "notificaciones" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {saving === "notificaciones" ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
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
                      { label: "Plan Actual", value: tenantInfo?.plan || "—", icon: Building2 },
                      { label: "Base de Datos", value: "PostgreSQL (Railway)", icon: Database },
                      { label: "Almacenamiento", value: "Firebase Storage", icon: HardDrive },
                      { label: "Email Service", value: "Resend", icon: Bell },
                      { label: "Pasarela de Pago", value: "Recurrente", icon: DollarSign },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-sm font-mono">{item.value}</span>
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
                    {tenantInfo ? (
                      [
                        { label: "Usuarios", usage: tenantInfo.usage.usuarios, icon: Users },
                        { label: "Bodegas", usage: tenantInfo.usage.bodegas, icon: Building2 },
                        { label: "Productos", usage: tenantInfo.usage.productos, icon: Package },
                        { label: "Movimientos/mes", usage: tenantInfo.usage.movimientos, icon: RefreshCw },
                      ].map((item) => {
                        const used = item.usage?.used || 0;
                        const limit = item.usage?.limit || 0;
                        const pct = limit > 0 ? (used / limit) * 100 : 0;
                        const limitDisplay = limit >= 999999 ? "∞" : String(limit);
                        return (
                          <div key={item.label} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">{item.label}</span>
                              </div>
                              <span className="font-mono text-xs">
                                {used} / {limitDisplay}
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
                      })
                    ) : (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    )}
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
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-5 w-5" />
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
                      <p className="text-xs text-muted-foreground">
                        Elimina productos, movimientos e inventario marcados como prueba
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      Limpiar Datos
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div>
                      <p className="text-sm font-medium text-red-400">Reiniciar inventario</p>
                      <p className="text-xs text-muted-foreground">
                        Pone todas las cantidades de inventario en cero. Los movimientos se conservan.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      Reiniciar
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                    <div>
                      <p className="text-sm font-medium text-red-400">Eliminar empresa</p>
                      <p className="text-xs text-muted-foreground">
                        Elimina permanentemente todos los datos de tu empresa. Esta acción no se puede deshacer.
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      Eliminar Todo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
