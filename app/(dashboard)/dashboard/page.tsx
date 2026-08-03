"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import type { DashboardStats, MovimientoWithRelations } from "@/types";

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  borderColor: string;
  href?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<{
    conStock: { id: string; name: string; bodega: string; stock: number; category: string }[];
    stockBajo: { id: string; name: string; bodega: string; stock: number; minStock: number; category: string }[];
    sinStock: { id: string; name: string; bodega: string; category: string }[];
  }>({ conStock: [], stockBajo: [], sinStock: [] });
  const [valorPorBodega, setValorPorBodega] = useState<{ name: string; value: number; color: string }[]>([]);
  const [movimientosPorTipo, setMovimientosPorTipo] = useState<{ tipo: string; cantidad: number; color: string }[]>([]);
  const [topProductos, setTopProductos] = useState<{ name: string; movimientos: number }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    setStats({
      totalProductos: 1250,
      totalBodegas: 6,
      totalProveedores: 48,
      totalUsuarios: 12,
      stockBajo: 23,
      totalInventarioValor: 458200.5,
      movimientosHoy: 87,
      productosVencidos: 5,
      conteosActivos: 2,
      entradasMes: 340,
      salidasMes: 280,
    });

    setKanbanColumns({
      conStock: [
        { id: "1", name: "Tornillos 3/4\"", bodega: "Bodega Central", stock: 450, category: "Ferretería" },
        { id: "2", name: "Cemento Portland", bodega: "Bodega Norte", stock: 80, category: "Construcción" },
        { id: "3", name: "Laptop HP ProBook", bodega: "Bodega Central", stock: 25, category: "Electrónicos" },
        { id: "4", name: "Papel Bond A4", bodega: "Bodega Sur", stock: 500, category: "Papelería" },
        { id: "5", name: "Martillo 16oz", bodega: "Bodega Central", stock: 60, category: "Ferretería" },
      ],
      stockBajo: [
        { id: "6", name: "Destornillador Philips", bodega: "Bodega Central", stock: 3, minStock: 10, category: "Ferretería" },
        { id: "7", name: "Mouse Inalámbrico", bodega: "Bodega Sur", stock: 2, minStock: 5, category: "Electrónicos" },
        { id: "8", name: "Pintura Blanca Galón", bodega: "Bodega Norte", stock: 1, minStock: 4, category: "Pintura" },
      ],
      sinStock: [
        { id: "9", name: "Teclado USB", bodega: "Bodega Central", category: "Electrónicos" },
        { id: "10", name: "Cinta Adhesiva", bodega: "Bodega Sur", category: "Papelería" },
        { id: "11", name: "Escalera Aluminio", bodega: "Bodega Norte", category: "Ferretería" },
      ],
    });

    setValorPorBodega([
      { name: "Bodega Central", value: 245000, color: "#818cf8" },
      { name: "Bodega Norte", value: 120000, color: "#34d399" },
      { name: "Bodega Sur", value: 68000, color: "#fbbf24" },
      { name: "Bodega Este", value: 25200, color: "#f87171" },
    ]);

    setMovimientosPorTipo([
      { tipo: "Entrada", cantidad: 340, color: "#34d399" },
      { tipo: "Salida", cantidad: 280, color: "#f87171" },
      { tipo: "Ajuste", cantidad: 45, color: "#fbbf24" },
      { tipo: "Traslado", cantidad: 32, color: "#818cf8" },
    ]);

    setTopProductos([
      { name: "Tornillos 3/4\"", movimientos: 156 },
      { name: "Cemento Portland", movimientos: 134 },
      { name: "Laptop HP ProBook", movimientos: 98 },
      { name: "Papel Bond A4", movimientos: 89 },
      { name: "Martillo 16oz", movimientos: 76 },
      { name: "Pintura Blanca", movimientos: 67 },
      { name: "Mouse Inalámbrico", movimientos: 58 },
      { name: "Destornillador", movimientos: 52 },
      { name: "Cable HDMI", movimientos: 45 },
      { name: "Clavos 2\"", movimientos: 40 },
    ]);

    setRecentActivity(
      Array.from({ length: 20 }, (_, i) => {
        const productos = ["Tornillos", "Cemento", "Laptop HP", "Papel Bond", "Martillo", "Pintura", "Mouse", "Destornillador"];
        const bodegas = ["Bodega Central", "Bodega Norte", "Bodega Sur"];
        const usuarios = ["Juan Pérez", "María García", "Carlos López"];
        const tipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"] as const;
        return {
          id: `mov-${i + 1}`,
          tipo: tipos[i % 4],
          fecha: new Date(Date.now() - i * 3600000),
          cantidad: Math.floor(Math.random() * 50) + 1,
          producto: { nombre: productos[i % 8] },
          bodega: { nombre: bodegas[i % 3] },
          usuario: { nombre: usuarios[i % 3] },
        };
      }),
    );

    setLoading(false);
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
    ENTRADA: "success", SALIDA: "destructive", AJUSTE: "warning", TRASLADO: "default",
  };
  const tipoLabel: Record<string, string> = {
    ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste", TRASLADO: "Traslado",
  };

  const statCards: StatCard[] = [
    { label: "Bodegas Activas", value: stats?.totalBodegas ?? 0, icon: <Warehouse className="h-5 w-5" />, color: "text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20", href: "/bodegas" },
    { label: "Total Productos", value: stats?.totalProductos ?? 0, icon: <Package className="h-5 w-5" />, color: "text-indigo-400", bg: "bg-indigo-500/10", borderColor: "border-indigo-500/20", href: "/productos" },
    { label: "Items en Inventario", value: stats?.totalProductos ?? 0, icon: <ClipboardList className="h-5 w-5" />, color: "text-cyan-400", bg: "bg-cyan-500/10", borderColor: "border-cyan-500/20", href: "/inventario" },
    { label: "Valor Total (Q)", value: formatCurrency(stats?.totalInventarioValor ?? 0), icon: <DollarSign className="h-5 w-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
    { label: "Stock Bajo", value: stats?.stockBajo ?? 0, icon: <AlertTriangle className="h-5 w-5" />, color: "text-amber-400", bg: "bg-amber-500/10", borderColor: "border-amber-500/20", href: "/inventario?filter=low" },
    { label: "Sin Stock", value: stats?.productosVencidos ?? 0, icon: <PackageX className="h-5 w-5" />, color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500/20", href: "/inventario?filter=zero" },
    { label: "Movimientos Hoy", value: stats?.movimientosHoy ?? 0, icon: <ArrowLeftRight className="h-5 w-5" />, color: "text-violet-400", bg: "bg-violet-500/10", borderColor: "border-violet-500/20", href: "/movimientos" },
    { label: "Proveedores", value: stats?.totalProveedores ?? 0, icon: <Truck className="h-5 w-5" />, color: "text-orange-400", bg: "bg-orange-500/10", borderColor: "border-orange-500/20", href: "/proveedores" },
  ];

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
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Package className="mb-4 h-16 w-16 text-muted-foreground/30" />
        <p className="text-lg text-muted-foreground">No hay datos disponibles</p>
        <p className="text-sm text-muted-foreground/60">Comienza agregando productos y bodegas</p>
        <div className="mt-6 flex gap-3">
          <Button asChild><Link href="/productos">Agregar Producto</Link></Button>
          <Button variant="outline" asChild><Link href="/bodegas">Agregar Bodega</Link></Button>
        </div>
      </div>
    );
  }

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
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />Actualizar
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
            {kanbanColumns.conStock.map((item) => (
              <div key={item.id} className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 transition-colors hover:bg-emerald-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="success" className="text-[10px]">{item.stock} und</Badge>
                </div>
                <Badge variant="default" className="mt-1 text-[10px] bg-white/5">{item.category}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-amber-400">Stock Bajo</CardTitle>
            <CardDescription>Productos bajo el nivel mínimo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {kanbanColumns.stockBajo.map((item) => (
              <div key={item.id} className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 transition-colors hover:bg-amber-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="warning" className="text-[10px]">{item.stock}/{item.minStock} und</Badge>
                </div>
                <Badge variant="default" className="mt-1 text-[10px] bg-white/5">{item.category}</Badge>
              </div>
            ))}
            {kanbanColumns.stockBajo.length === 0 && (
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
            {kanbanColumns.sinStock.map((item) => (
              <div key={item.id} className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 transition-colors hover:bg-red-500/10">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.bodega}</span>
                  <Badge variant="destructive" className="text-[10px]">0 und</Badge>
                </div>
                <Badge variant="default" className="mt-1 text-[10px] bg-white/5">{item.category}</Badge>
              </div>
            ))}
            {kanbanColumns.sinStock.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Sin productos agotados</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-white">Valor por Bodega</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-white">Movimientos por Tipo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={movimientosPorTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                <XAxis dataKey="tipo" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
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
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Top 10 Productos</CardTitle>
            <CardDescription>Por cantidad de movimientos</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Actividad Reciente</CardTitle>
          <CardDescription>Últimos 20 movimientos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 space-y-1 overflow-y-auto pr-2">
            {recentActivity.map((mov, i) => (
              <motion.div
                key={mov.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.02]"
              >
                <Badge variant={tipoBadge[mov.tipo] || "default"} className="shrink-0 text-[10px]">
                  {tipoLabel[mov.tipo] || mov.tipo}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{mov.producto?.nombre || "Producto"}</p>
                  <p className="text-xs text-muted-foreground">{mov.bodega?.nombre || "Bodega"} · Qty: {mov.cantidad}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">{mov.usuario?.nombre || "Usuario"}</p>
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                    <Clock className="h-3 w-3" />{formatRelativeTime(mov.fecha)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
