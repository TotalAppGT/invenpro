"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Search, Filter, Download, FileSpreadsheet, FileText, Package, TrendingUp,
  DollarSign, BarChart3, Calendar, Warehouse, Loader2, ArrowDownUp,
  AlertCircle, ChevronDown,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  calculateKardex, calculateTotalKardexSummary,
  type KardexEntry, type ValuationMovement,
} from "@/lib/inventory-valuation";
import { useDebounce } from "@/hooks/useDebounce";

const kardexFilterSchema = z.object({
  productoId: z.string().min(1, "Seleccione un producto"),
  bodegaId: z.string().min(1, "Seleccione una bodega"),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  metodo: z.enum(["PEPS", "UEPS", "PROMEDIO"]).default("PROMEDIO"),
});

type KardexFilterValues = z.infer<typeof kardexFilterSchema>;

interface ProductoOption { id: string; nombre: string; codigo: string; codigoBarras: string | null; }
interface BodegaOption { id: string; nombre: string; }

export default function KardexPage() {
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [productoSearch, setProductoSearch] = useState("");
  const debouncedProductoSearch = useDebounce(productoSearch, 300);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoOption | null>(null);
  const [kardexEntries, setKardexEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [chartData, setChartData] = useState<{ fecha: string; entrada: number; salida: number }[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<KardexFilterValues>({
    resolver: zodResolver(kardexFilterSchema),
    defaultValues: {
      productoId: "", bodegaId: "", desde: "", hasta: "", metodo: "PROMEDIO",
    },
  });

  const metodoSeleccionado = watch("metodo");

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [prodRes, bodRes] = await Promise.all([
          fetch("/api/productos?limit=500&estado=ACTIVO"),
          fetch("/api/bodegas?activa=true&limit=100"),
        ]);
        const [prodData, bodData] = await Promise.all([prodRes.json(), bodRes.json()]);
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
    if (!debouncedProductoSearch.trim()) return productos;
    const q = debouncedProductoSearch.toLowerCase();
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
    );
  }, [productos, debouncedProductoSearch]);

  const fetchKardex = useCallback(async (data: KardexFilterValues) => {
    setLoading(true);
    setHasSearched(true);
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
        const entries = json.data.entries || [];
        setKardexEntries(entries);

        const chartDataPoints = entries.reduce(
          (acc: { fecha: string; entrada: number; salida: number }[], entry: KardexEntry) => {
            const fechaStr = format(new Date(entry.fecha), "dd/MM/yy");
            const existing = acc.find((a) => a.fecha === fechaStr);
            if (existing) {
              existing.entrada += entry.entradaCant;
              existing.salida += entry.salidaCant;
            } else {
              acc.push({ fecha: fechaStr, entrada: entry.entradaCant, salida: entry.salidaCant });
            }
            return acc;
          }, []);
        setChartData(chartDataPoints);
      } else {
        setKardexEntries([]);
        setChartData([]);
      }
    } catch (err) {
      console.error("Error fetching kardex:", err);
      setKardexEntries([]);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = (data: KardexFilterValues) => {
    fetchKardex(data);
  };

  const summary = useMemo(() => {
    if (kardexEntries.length === 0) {
      return { stockActual: 0, valorTotal: 0, costoPromedio: 0, totalEntradas: 0, totalSalidas: 0, totalEntradasValor: 0, totalSalidasValor: 0 };
    }
    return calculateTotalKardexSummary(kardexEntries);
  }, [kardexEntries]);

  const exportToExcel = useCallback(() => {
    if (kardexEntries.length === 0) return;
    const headers = [
      "Fecha", "Tipo", "Documento", "Entrada Cant", "Entrada Costo Unit",
      "Entrada Total", "Salida Cant", "Salida Costo Unit", "Salida Total",
      "Saldo Cant", "Saldo Costo Unit", "Saldo Total",
    ];
    const rows = kardexEntries.map((e) => [
      format(new Date(e.fecha), "dd/MM/yyyy"), e.tipo, e.documento || "",
      e.entradaCant, e.entradaCostoUnit.toFixed(4), e.entradaTotal.toFixed(2),
      e.salidaCant, e.salidaCostoUnit.toFixed(4), e.salidaTotal.toFixed(2),
      e.saldoCant, e.saldoCostoUnit.toFixed(4), e.saldoTotal.toFixed(2),
    ]);
    const bom = "\uFEFF";
    const csvContent = bom + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kardex_${selectedProducto?.codigo || "producto"}_${metodoSeleccionado}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [kardexEntries, selectedProducto, metodoSeleccionado]);

  const exportToPDF = useCallback(() => {
    if (kardexEntries.length === 0) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    doc.setFontSize(16);
    doc.text("Kardex Valorizado", 14, 20);
    doc.setFontSize(11);
    doc.text(`Producto: ${selectedProducto?.nombre || "N/A"} (${selectedProducto?.codigo || ""})`, 14, 28);
    doc.text(`Metodo: ${metodoSeleccionado}`, 14, 35);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 42);

    const tableRows = kardexEntries.map((e) => [
      format(new Date(e.fecha), "dd/MM/yy"), e.tipo, e.documento || "",
      e.entradaCant.toString(), e.entradaCostoUnit.toFixed(4), e.entradaTotal.toFixed(2),
      e.salidaCant.toString(), e.salidaCostoUnit.toFixed(4), e.salidaTotal.toFixed(2),
      e.saldoCant.toString(), e.saldoCostoUnit.toFixed(4), e.saldoTotal.toFixed(2),
    ]);

    (doc as any).autoTable({
      startY: 48,
      head: [["Fecha", "Tipo", "Doc.", "Ent. Cant", "Ent. C.U.", "Ent. Total",
        "Sal. Cant", "Sal. C.U.", "Sal. Total", "Sdo. Cant", "Sdo. C.U.", "Sdo. Total"]],
      body: tableRows,
      styles: { fontSize: 7, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { top: 48 },
    });

    doc.save(`kardex_${selectedProducto?.codigo || "producto"}_${metodoSeleccionado}.pdf`);
  }, [kardexEntries, selectedProducto, metodoSeleccionado]);

  const tipoBadge = useCallback((tipo: string) => {
    const variants: Record<string, "success" | "destructive" | "warning" | "outline" | "default"> = {
      ENTRADA: "success", SALIDA: "destructive", AJUSTE: "warning",
      TRASLADO: "outline", CONTEO_DIFERENCIA: "default",
    };
    return <Badge variant={variants[tipo] || "outline"}>{tipo.replace("_", " ")}</Badge>;
  }, []);

  if (initialLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-indigo-400" />
            Kardex Valorizado
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Control de entradas, salidas y saldos por producto
          </p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-400" />
              Filtros de Busqueda
            </CardTitle>
            <CardDescription>
              Seleccione producto, bodega y rango de fechas para consultar el kardex
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <label className="mb-1.5 block text-sm font-medium text-white">Producto</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input
                      placeholder="Buscar producto..."
                      value={productoSearch}
                      onChange={(e) => { setProductoSearch(e.target.value); setShowProductoDropdown(true); }}
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
                        className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-[#0f0f2e] shadow-lg backdrop-blur-md max-h-60 overflow-auto p-1"
                      >
                        {filteredProductos.slice(0, 50).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-white/[0.05]"
                            onClick={() => {
                              setSelectedProducto(p);
                              setValue("productoId", p.id);
                              setProductoSearch(`${p.codigo} - ${p.nombre}`);
                              setShowProductoDropdown(false);
                            }}
                          >
                            <Package className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium text-white">{p.nombre}</div>
                              <div className="text-xs text-white/40">{p.codigo}</div>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {errors.productoId && <p className="mt-1 text-xs text-red-400">{errors.productoId.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Bodega</label>
                <Controller name="bodegaId" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar bodega" /></SelectTrigger>
                    <SelectContent>
                      {bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.bodegaId && <p className="mt-1 text-xs text-red-400">{errors.bodegaId.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Metodo</label>
                <Controller name="metodo" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Metodo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PEPS">PEPS - FIFO</SelectItem>
                      <SelectItem value="UEPS">UEPS - LIFO</SelectItem>
                      <SelectItem value="PROMEDIO">Promedio Ponderado</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Desde</label>
                <Controller name="desde" control={control} render={({ field }) => (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input type="date" className="pl-10" {...field} />
                  </div>
                )} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Hasta</label>
                <Controller name="hasta" control={control} render={({ field }) => (
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <Input type="date" className="pl-10" {...field} />
                  </div>
                )} />
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={loading} className="bg-indigo-500 hover:bg-indigo-600">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Consultar
            </Button>
            <Button variant="outline" onClick={exportToPDF} disabled={kardexEntries.length === 0}>
              <FileText className="mr-2 h-4 w-4" />Exportar PDF
            </Button>
            <Button variant="outline" onClick={exportToExcel} disabled={kardexEntries.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar Excel
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      )}

      {!loading && kardexEntries.length > 0 && (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-white/50">
                  <Package className="h-4 w-4 text-indigo-400" />Stock Actual
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-white">{summary.stockActual}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-white/50">
                  <DollarSign className="h-4 w-4 text-emerald-400" />Valor Total
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-emerald-400">{formatCurrency(summary.valorTotal)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-white/50">
                  <TrendingUp className="h-4 w-4 text-amber-400" />Costo Promedio
                </CardDescription>
                <CardTitle className="text-3xl font-bold text-amber-400">{formatCurrency(summary.costoPromedio)}</CardTitle>
              </CardHeader>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
              <CardHeader>
                <CardTitle className="text-lg text-white">Grafico de Movimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 20%)" />
                    <XAxis dataKey="fecha" stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                    <YAxis stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(240 15% 8%)", border: "1px solid hsl(240 15% 20%)", borderRadius: "8px", color: "hsl(210 40% 98%)" }} />
                    <Legend />
                    <Line type="monotone" dataKey="entrada" name="Entradas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="salida" name="Salidas" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-white">Tabla Kardex</CardTitle>
                    <CardDescription>{kardexEntries.length} movimientos encontrados</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {selectedProducto?.codigo || "N/A"} - {selectedProducto?.nombre || "N/A"}
                    </Badge>
                    <Badge className="text-[10px] bg-indigo-500">{metodoSeleccionado}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-white/50 whitespace-nowrap">Fecha</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap">Tipo</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap">Documento</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Ent. Cant</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Ent. C.U.</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Ent. Total</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sal. Cant</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sal. C.U.</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sal. Total</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sdo. Cant</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sdo. C.U.</TableHead>
                        <TableHead className="text-white/50 whitespace-nowrap text-right">Sdo. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kardexEntries.map((entry, idx) => (
                        <TableRow key={idx} className="border-white/[0.02] transition-all hover:bg-white/[0.02]">
                          <TableCell className="whitespace-nowrap text-xs text-white/60">
                            {format(new Date(entry.fecha), "dd/MM/yy HH:mm")}
                          </TableCell>
                          <TableCell>{tipoBadge(entry.tipo)}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-white/40">{entry.documento || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm">
                            {entry.entradaCant > 0 ? <span className="text-emerald-400">{entry.entradaCant}</span> : "0"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs text-white/40">
                            {entry.entradaCostoUnit > 0 ? formatCurrency(entry.entradaCostoUnit) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm text-white/60">
                            {entry.entradaTotal > 0 ? formatCurrency(entry.entradaTotal) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm">
                            {entry.salidaCant > 0 ? <span className="text-red-400">{entry.salidaCant}</span> : "0"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs text-white/40">
                            {entry.salidaCostoUnit > 0 ? formatCurrency(entry.salidaCostoUnit) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right text-sm text-white/60">
                            {entry.salidaTotal > 0 ? formatCurrency(entry.salidaTotal) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold text-white">{entry.saldoCant}</TableCell>
                          <TableCell className="whitespace-nowrap text-right text-xs text-white/40">
                            {entry.saldoCostoUnit > 0 ? formatCurrency(entry.saldoCostoUnit) : "-"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold text-white">
                            {entry.saldoTotal > 0 ? formatCurrency(entry.saldoTotal) : "Q0.00"}
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

      {!loading && hasSearched && kardexEntries.length === 0 && selectedProducto && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-16 w-16 text-white/10" />
          <h3 className="mt-4 text-lg text-white/40">Sin movimientos</h3>
          <p className="mt-1 text-sm text-white/20">
            No se encontraron movimientos para este producto en el periodo seleccionado.
          </p>
        </motion.div>
      )}

      {!loading && !hasSearched && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20">
          <BarChart3 className="h-20 w-20 text-white/5" />
          <h3 className="mt-6 text-xl text-white/30">Seleccione un producto y bodega</h3>
          <p className="mt-2 text-sm text-white/15">Use los filtros para consultar el kardex valorizado</p>
        </motion.div>
      )}
    </div>
  );
}
