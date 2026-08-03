"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatRelativeTime, cn } from "@/lib/utils";
import {
  Warehouse,
  Package,
  ClipboardList,
  DollarSign,
  AlertTriangle,
  PackageX,
  ArrowLeftRight,
  Truck,
  Eye,
  RefreshCw,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "@/components/ui/recharts-fallback";
import type { DashboardStats } from "@/types";

interface KanbanItem {
  id?: string;
  name?: string;
  nombre?: string;
  bodega: string;
  stock?: number;
  minStock?: number;
  category?: string;
  cantidad?: number;
  stockMin?: number;
  stockMax?: number;
  costoUnit?: number;
  precioUnit?: number;
  valorTotal?: number;
  productoId?: string;
  codigo?: string;
  sku?: string;
  codigoBarras?: string;
  imagen?: string;
  status?: string;
}

interface DashboardData {
  stats: DashboardStats;
  kanban: {
    conStock: KanbanItem[];
    bajo: KanbanItem[];
    sin: KanbanItem[];
  };
  charts: {
    valorPorBodega: Array<{ bodegaId: string; nombre: string; cantidadTotal: number }>;
    movimientosPorTipo: Array<{ tipo: string; count: number }>;
    topProductos: Array<{ productoId: string; nombre: string; codigo: string; cantidad: number; bodega: string }>;
  };
  recentMovements: Array<{
    id: string;
    tipo: string;
    fecha: string;
    cantidad: number;
    producto: string;
    codigo: string;
    bodega: string;
    bodegaDestino: string | null;
    usuario: string;
    notas: string | null;
  }>;
}

const CHART_COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf"];

const TIPO_COLORS: Record<string, string> = {
  ENTRADA: "#34d399",
  SALIDA: "#f87171",
  AJUSTE: "#fbbf24",
  TRASLADO: "#818cf8",
  CONTEO_DIFERENCIA: "#a78bfa",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.error || "Invalid response");
      }
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const tipoBadge: Record<string, "success" | "destructive" | "warning" | "default"> = {
    ENTRADA: "success",
    SALIDA: "destructive",
    AJUSTE: "warning",
    TRASLADO: "default",
    CONTEO_DIFERENCIA: "warning",
  };
  const tipoLabel: Record<string, string> = {
    ENTRADA: "Entrada",
    SALIDA: "Salida",
    AJUSTE: "Ajuste",
    TRASLADO: "Traslado",
    CONTEO_DIFERENCIA: "Conteo",
  };

  const stats = data?.stats;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">Error al cargar datos del dashboard</p>
        <p className="text-sm text-muted-foreground/60">Verifica tu conexion e intenta de nuevo</p>
        <Button onClick={fetchData} className="mt-6 bg-indigo-500 hover:bg-indigo-600">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  const statCards = [
    { label: "Bodegas Activas", value: stats?.totalBodegas ?? 0, icon: <Warehouse className="h-5 w-5" />, color: "text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20", href: "/bodegas" },
    { label: "Total Productos", value: stats?.totalProductos ?? 0, icon: <Package className="h-5 w-5" />, color: "text-indigo-400", bg: "bg-indigo-500/10", borderColor: "border-indigo-500/20", href: "/productos" },
    { label: "Items en Inventario", value: stats?.totalProductos ?? 0, icon: <ClipboardList className="h-5 w-5" />, color: "text-cyan-400", bg: "bg-cyan-500/10", borderColor: "border-cyan-500/20", href: "/inventario" },
    { label: "Valor Total (Q)", value: formatCurrency(stats?.totalInventarioValor ?? 0), icon: <DollarSign className="h-5 w-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
    { label: "Stock Bajo", value: stats?.stockBajo ?? 0, icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-400", bg: "bg-amber-500/10", borderColor: "border-amber-500/20", href: "/inventario?filter=low" },
    { label: "Sin Stock", value: stats?.productosVencidos ?? 0, icon: <PackageX className="h-5 w-5" />, color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500/20", href: "/inventario?filter=zero" },
    { label: "Movimientos Hoy", value: stats?.movimientosHoy ?? 0, icon: <ArrowLeftRight className="h-5 w-5" />, color: "text-violet-400", bg: "bg-violet-500/10", borderColor: "border-violet-500/20", href: "/movimientos" },
    { label: "Proveedores", value: stats?.totalProveedores ?? 0, icon: <Truck className="h-5 w-5" />, color: "text-orange-400", bg: "bg-orange-500/10", borderColor: "border-orange-500/20", href: "/proveedores" },
  ];

  const conStock = data.kanban?.conStock?.map((item: KanbanItem) => ({
    id: item.productoId || item.id || "",
    name: item.nombre || item.name || "",
    bodega: item.bodega || "",
    stock: item.cantidad ?? item.stock ?? 0,
    category: "",
  })) || [];

  const stockBajo = data.kanban?.bajo?.map((item: KanbanItem) => ({
    id: item.productoId || item.id || "",
    name: item.nombre || item.name || "",
    bodega: item.bodega || "",
    stock: item.cantidad ?? item.stock ?? 0,
    minStock: item.stockMin ?? item.minStock ?? 0,
    category: "",
  })) || [];

  const sinStock = data.kanban?.sin?.map((item: KanbanItem) => ({
    id: item.productoId || item.id || "",
    name: item.nombre || item.name || "",
    bodega: item.bodega || "",
    category: "",
  })) || [];

  const valorPorBodega = (data.charts?.valorPorBodega || []).map((v, i) => ({
    name: v.nombre,
    value: v.cantidadTotal,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const movimientosPorTipo = (data.charts?.movimientosPorTipo || []).map((m) => ({
    tipo: tipoLabel[m.tipo] || m.tipo,
    cantidad: m.count,
    color: TIPO_COLORS[m.tipo] || "#818cf8",
  }));

  const topProductos = (data.charts?.topProductos || []).slice(0, 10).map((p) => ({
    name: p.nombre,
    movimientos: p.cantidad,
  }));

  const recentActivity = (data.recentMovements || []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen general del inventario</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground">Auto-refresh 30s</Label>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
          >
            {card.href ? (
              <Link href={card.href}>
                <Card className={cn("border transition-colors hover:bg-white/[0.03]", card.borderColor, "bg-[#0a0a2a]/60 backdrop-blur-sm")}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className={cn("rounded-lg p-2.5", card.bg)}>
                        <span className={card.color}>{card.icon}</span>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                    <div className="mt-3">
                      <p className="text-xl font-bold text-white">{card.value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card className={cn("border", card.borderColor, "bg-[#0a0a2a]/60 backdrop-blur-sm")}>
                <CardContent className="p-4">
                  <div className={cn("rounded-lg p-2.5", card.bg)}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xl font-bold text-white">{card.value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Con Stock</CardTitle>
            <CardDescription>Productos con inventario normal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {conStock.map((item) => (
              <div key={item.id} className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 transition-colors hover:bg-emerald-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="success" className="text-[10px]">{item.stock} und</Badge>
                </div>
              </div>
            ))}
            {conStock.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Sin productos en esta categoria</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400">Stock Bajo</CardTitle>
            <CardDescription>Productos bajo el nivel minimo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {stockBajo.map((item) => (
              <div key={item.id} className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="warning" className="text-[10px]">{item.stock}/{item.minStock} und</Badge>
                </div>
              </div>
            ))}
            {stockBajo.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Sin productos en stock bajo</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-red-400">Sin Stock</CardTitle>
            <CardDescription>Productos agotados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {sinStock.map((item) => (
              <div key={item.id} className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 transition-colors hover:bg-red-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="destructive" className="text-[10px]">0 und</Badge>
                </div>
              </div>
            ))}
            {sinStock.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Sin productos agotados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-white">Valor por Bodega</CardTitle></CardHeader>
          <CardContent>
            {valorPorBodega.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={valorPorBodega} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {valorPorBodega.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a2a", border: "1px solid #1e1e3f", borderRadius: "8px", color: "#fff" }}
                    formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-xs text-muted-foreground">Sin datos de valor por bodega</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-white">Movimientos por Tipo</CardTitle></CardHeader>
          <CardContent>
            {movimientosPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={movimientosPorTipo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                  <XAxis dataKey="tipo" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a2a", border: "1px solid #1e1e3f", borderRadius: "8px", color: "#fff" }}
                    formatter={(value: number) => [value, "Cantidad"]}
                  />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {movimientosPorTipo.map((entry) => (
                      <Cell key={entry.tipo} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-xs text-muted-foreground">Sin movimientos recientes</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Top 10 Productos</CardTitle>
            <CardDescription>Por cantidad de movimientos</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductos.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProductos} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                  <XAxis type="number" stroke="#6b7280" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#6b7280" fontSize={11} width={100} tick={{ fill: "#9ca3af" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0a0a2a", border: "1px solid #1e1e3f", borderRadius: "8px", color: "#fff" }}
                    formatter={(value: number) => [value, "Movimientos"]}
                  />
                  <Bar dataKey="movimientos" fill="#818cf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-xs text-muted-foreground">Sin datos de productos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Actividad Reciente</CardTitle>
          <CardDescription>Ultimos movimientos registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="max-h-80 space-y-1 overflow-y-auto pr-2">
              {recentActivity.map((mov, i) => (
                <motion.div
                  key={mov.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]"
                >
                  <Badge variant={tipoBadge[mov.tipo] || "default"} className="shrink-0 text-[10px]">
                    {tipoLabel[mov.tipo] || mov.tipo}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{mov.producto || "Producto"}</p>
                    <p className="text-xs text-muted-foreground">{mov.bodega || "Bodega"} · Qty: {mov.cantidad}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{mov.usuario || "Usuario"}</p>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock className="h-3 w-3" />{formatRelativeTime(mov.fecha)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10">
              <Clock className="mb-3 h-10 w-10 text-white/10" />
              <p className="text-sm text-muted-foreground">Sin actividad reciente</p>
              <p className="text-xs text-muted-foreground/60">Los movimientos apareceran aqui cuando se registren</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
