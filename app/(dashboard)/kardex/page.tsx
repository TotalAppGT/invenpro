"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Warehouse,
  ChevronDown,
  X,
  Loader2,
  ArrowDownUp,
  ArrowUp,
  ArrowDown,
  AlertCircle,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  calculateKardex,
  calculateTotalKardexSummary,
  type KardexEntry,
  type ValuationMovement,
} from "@/lib/inventory-valuation";

const kardexFilterSchema = z.object({
  productoId: z.string().min(1, "Seleccione un producto"),
  bodegaId: z.string().min(1, "Seleccione una bodega"),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  metodo: z.enum(["PEPS", "UEPS", "PROMEDIO"]).default("PROMEDIO"),
});

type KardexFilterValues = z.infer<typeof kardexFilterSchema>;

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  codigoBarras: string | null;
}

interface BodegaOption {
  id: string;
  nombre: string;
}

interface MovimientoData {
  id: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  costoUnit: number;
  total: number;
  documento: string | null;
  notas: string | null;
  producto: { id: string; nombre: string; codigo: string };
  bodega: { id: string; nombre: string };
}

export default function KardexPage() {
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [productoSearch, setProductoSearch] = useState("");
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoOption | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoData[]>([]);
  const [kardexEntries, setKardexEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [chartData, setChartData] = useState<{ fecha: string; entrada: number; salida: number }[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<KardexFilterValues>({
    resolver: zodResolver(kardexFilterSchema),
    defaultValues: {
      productoId: "",
      bodegaId: "",
      desde: "",
      hasta: "",
      metodo: "PROMEDIO",
    },
  });

  const metodoSeleccionado = watch("metodo");
  const bodegaId = watch("bodegaId");

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [prodRes, bodRes] = await Promise.all([
          fetch("/api/productos?limit=500&estado=ACTIVO"),
          fetch("/api/bodegas?activa=true&limit=100"),
        ]);

        const prodData = await prodRes.json();
        const bodData = await bodRes.json();

        if (prodData.success) setProductos(prodData.data || []);
        if (bodData.success) setBodegas(bodData.data || []);
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setInitialLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const filteredProductos = useMemo(() => {
    if (!productoSearch.trim()) return productos;
    const q = productoSearch.toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
    );
  }, [productos, productoSearch]);

  const fetchKardex = useCallback(async (data: KardexFilterValues) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("productoId", data.productoId);
      params.set("bodegaId", data.bodegaId);
      params.set("metodo", data.metodo);
      if (data.desde) params.set("desde", data.desde);
      if (data.hasta) params.set("hasta", data.hasta);
      params.set("limit", "500");

      const res = await fetch(`/api/kardex?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        const movements = json.data.entries || [];
        setKardexEntries(movements);

        const rawMovements = json.meta
          ? []
          : [];

        if (json.data.pagination) {
          setMovimientos([]);
        }

        const chartDataPoints = movements.reduce((acc: { fecha: string; entrada: number; salida: number }[], entry: KardexEntry) => {
          const fechaStr = format(new Date(entry.fecha), "dd/MM/yy");
          const existing = acc.find((a) => a.fecha === fechaStr);
          if (existing) {
            existing.entrada += entry.entradaCant;
            existing.salida += entry.salidaCant;
          } else {
            acc.push({
              fecha: fechaStr,
              entrada: entry.entradaCant,
              salida: entry.salidaCant,
            });
          }
          return acc;
        }, []);
        setChartData(chartDataPoints);
      }
    } catch (err) {
      console.error("Error fetching kardex:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = (data: KardexFilterValues) => {
    fetchKardex(data);
  };

  const summary = useMemo(() => {
    return calculateTotalKardexSummary(kardexEntries);
  }, [kardexEntries]);

  const valuationMovements: ValuationMovement[] = useMemo(() => {
    if (movimientos.length === 0 && kardexEntries.length === 0) return [];
    if (movimientos.length > 0) {
      return movimientos.map((m) => ({
        id: m.id,
        fecha: new Date(m.fecha),
        tipo: m.tipo as any,
        cantidad: m.cantidad,
        costoUnit: m.costoUnit,
        total: m.total,
        documento: m.documento,
        detalle: m.notas,
      }));
    }
    return [];
  }, [movimientos, kardexEntries]);

  const clientCalculatedEntries = useMemo(() => {
    if (valuationMovements.length === 0) return [];
    return calculateKardex(valuationMovements, metodoSeleccionado);
  }, [valuationMovements, metodoSeleccionado]);

  const hasServerData = kardexEntries.length > 0;
  const hasClientData = clientCalculatedEntries.length > 0;
  const displayEntries = hasServerData ? kardexEntries : clientCalculatedEntries;
  const displaySummary = hasServerData
    ? summary
    : calculateTotalKardexSummary(clientCalculatedEntries);

  const exportToExcel = () => {
    if (displayEntries.length === 0) return;
    const headers = [
      "Fecha",
      "Tipo",
      "Documento",
      "Entrada Cant",
      "Entrada Costo Unit",
      "Entrada Total",
      "Salida Cant",
      "Salida Costo Unit",
      "Salida Total",
      "Saldo Cant",
      "Saldo Costo Unit",
      "Saldo Total",
    ];
    const rows = displayEntries.map((e) => [
      format(new Date(e.fecha), "dd/MM/yyyy"),
      e.tipo,
      e.documento || "",
      e.entradaCant,
      e.entradaCostoUnit.toFixed(4),
      e.entradaTotal.toFixed(2),
      e.salidaCant,
      e.salidaCostoUnit.toFixed(4),
      e.salidaTotal.toFixed(2),
      e.saldoCant,
      e.saldoCostoUnit.toFixed(4),
      e.saldoTotal.toFixed(2),
    ]);

    const bom = "\uFEFF";
    const csvContent =
      bom +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kardex_${selectedProducto?.codigo || "producto"}_${metodoSeleccionado}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (displayEntries.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFontSize(16);
    doc.text("Kardex Valorizado", 14, 20);
    doc.setFontSize(11);
    doc.text(`Producto: ${selectedProducto?.nombre || "N/A"} (${selectedProducto?.codigo || ""})`, 14, 28);
    doc.text(`Metodo: ${metodoSeleccionado}`, 14, 35);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 42);

    const tableRows = displayEntries.map((e) => [
      format(new Date(e.fecha), "dd/MM/yy"),
      e.tipo,
      e.documento || "",
      e.entradaCant.toString(),
      e.entradaCostoUnit.toFixed(4),
      e.entradaTotal.toFixed(2),
      e.salidaCant.toString(),
      e.salidaCostoUnit.toFixed(4),
      e.salidaTotal.toFixed(2),
      e.saldoCant.toString(),
      e.saldoCostoUnit.toFixed(4),
      e.saldoTotal.toFixed(2),
    ]);

    (doc as any).autoTable({
      startY: 48,
      head: [[
        "Fecha", "Tipo", "Doc.", "Ent. Cant", "Ent. C.U.", "Ent. Total",
        "Sal. Cant", "Sal. C.U.", "Sal. Total", "Sdo. Cant", "Sdo. C.U.", "Sdo. Total",
      ]],
      body: tableRows,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { top: 48 },
    });

    doc.save(`kardex_${selectedProducto?.codigo || "producto"}_${metodoSeleccionado}.pdf`);
  };

  const tipoBadge = (tipo: string) => {
    const variants: Record<string, "success" | "destructive" | "warning" | "outline" | "default"> = {
      ENTRADA: "success",
      SALIDA: "destructive",
      AJUSTE: "warning",
      TRASLADO: "outline",
      CONTEO_DIFERENCIA: "default",
    };
    return <Badge variant={variants[tipo] || "outline"}>{tipo.replace("_", " ")}</Badge>;
  };

  if (initialLoading) {
    return (
      <div className="cosmic-bg min-h-screen">
        <div className="cosmic-grid" />
        <div className="relative z-10 space-y-6 p-4 md:p-6 lg:p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="cosmic-bg min-h-screen">
      <div className="cosmic-grid" />
      <div className="relative z-10 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Kardex Valorizado
              </h1>
              <p className="mt-1 text-muted-foreground">
                Control de entradas, salidas y saldos por producto
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filtros de Búsqueda
              </CardTitle>
              <CardDescription>
                Seleccione producto, bodega y rango de fechas para consultar el kardex
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <div className="relative">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Producto
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar producto..."
                        value={productoSearch}
                        onChange={(e) => {
                          setProductoSearch(e.target.value);
                          setShowProductoDropdown(true);
                        }}
                        onFocus={() => setShowProductoDropdown(true)}
                        className="pl-10"
                      />
                    </div>
                    <AnimatePresence>
                      {showProductoDropdown && filteredProductos.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-popover shadow-lg backdrop-blur-md"
                        >
                          <div className="max-h-60 overflow-auto p-1">
                            {filteredProductos.slice(0, 50).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                                onClick={() => {
                                  setSelectedProducto(p);
                                  setValue("productoId", p.id);
                                  setProductoSearch(`${p.codigo} - ${p.nombre}`);
                                  setShowProductoDropdown(false);
                                }}
                              >
                                <Package className="h-4 w-4 text-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{p.nombre}</div>
                                  <div className="text-xs text-muted-foreground">{p.codigo}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {errors.productoId && (
                    <p className="mt-1 text-xs text-destructive">{errors.productoId.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Bodega
                  </label>
                  <Controller
                    name="bodegaId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <Warehouse className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Seleccionar bodega" />
                        </SelectTrigger>
                        <SelectContent>
                          {bodegas.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bodegaId && (
                    <p className="mt-1 text-xs text-destructive">{errors.bodegaId.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Método Valuación
                  </label>
                  <Controller
                    name="metodo"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <ArrowDownUp className="mr-2 h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PEPS">PEPS - FIFO</SelectItem>
                          <SelectItem value="UEPS">UEPS - LIFO</SelectItem>
                          <SelectItem value="PROMEDIO">Promedio Ponderado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Desde
                  </label>
                  <Controller
                    name="desde"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Hasta
                  </label>
                  <Controller
                    name="hasta"
                    control={control}
                    render={({ field }) => (
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
                    )}
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Consultar
              </Button>
              <Button
                variant="outline"
                onClick={exportToPDF}
                disabled={displayEntries.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button
                variant="outline"
                onClick={exportToExcel}
                disabled={displayEntries.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {displayEntries.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              <Card className="glass glow-border">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Stock Actual
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold text-foreground">
                    {displaySummary.stockActual}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="glass glow-border">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Valor Total
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold text-emerald-400">
                    {formatCurrency(displaySummary.valorTotal)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="glass glow-border">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    Costo Promedio
                  </CardDescription>
                  <CardTitle className="text-3xl font-bold text-amber-400">
                    {formatCurrency(displaySummary.costoPromedio)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
                  <CardDescription>
                    Gráfico de entradas y salidas en el período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 20%)" />
                      <XAxis
                        dataKey="fecha"
                        stroke="hsl(215 20.2% 65.1%)"
                        fontSize={12}
                      />
                      <YAxis stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(240 15% 8%)",
                          border: "1px solid hsl(240 15% 20%)",
                          borderRadius: "8px",
                          color: "hsl(210 40% 98%)",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="entrada"
                        name="Entradas"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="salida"
                        name="Salidas"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Tabla Kardex</CardTitle>
                      <CardDescription>
                        {displayEntries.length} movimientos encontrados
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {selectedProducto?.codigo || "N/A"} - {selectedProducto?.nombre || "N/A"}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        {metodoSeleccionado}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Fecha</TableHead>
                          <TableHead className="whitespace-nowrap">Tipo</TableHead>
                          <TableHead className="whitespace-nowrap">Documento</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ent. Cant</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ent. C.U.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Ent. Total</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sal. Cant</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sal. C.U.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sal. Total</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sdo. Cant</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sdo. C.U.</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Sdo. Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayEntries.map((entry, idx) => (
                          <TableRow key={idx} className="transition-all hover:bg-muted/50">
                            <TableCell className="whitespace-nowrap text-xs">
                              {format(new Date(entry.fecha), "dd/MM/yy HH:mm")}
                            </TableCell>
                            <TableCell>{tipoBadge(entry.tipo)}</TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {entry.documento || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {entry.entradaCant > 0 ? (
                                <span className="text-emerald-400">{entry.entradaCant}</span>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                              {entry.entradaCostoUnit > 0
                                ? formatCurrency(entry.entradaCostoUnit)
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {entry.entradaTotal > 0
                                ? formatCurrency(entry.entradaTotal)
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {entry.salidaCant > 0 ? (
                                <span className="text-red-400">{entry.salidaCant}</span>
                              ) : "0"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                              {entry.salidaCostoUnit > 0
                                ? formatCurrency(entry.salidaCostoUnit)
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-sm">
                              {entry.salidaTotal > 0
                                ? formatCurrency(entry.salidaTotal)
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold">
                              {entry.saldoCant}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                              {entry.saldoCostoUnit > 0
                                ? formatCurrency(entry.saldoCostoUnit)
                                : "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right font-semibold">
                              {entry.saldoTotal > 0
                                ? formatCurrency(entry.saldoTotal)
                                : "Q0.00"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {!loading && displayEntries.length === 0 && selectedProducto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <AlertCircle className="h-16 w-16 text-muted-foreground/40" />
            <h3 className="mt-4 text-lg font-medium text-muted-foreground">
              Sin movimientos
            </h3>
            <p className="mt-1 text-sm text-muted-foreground/60">
              No se encontraron movimientos para este producto en el período seleccionado.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
