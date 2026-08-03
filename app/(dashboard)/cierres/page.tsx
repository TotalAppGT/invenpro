"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Plus,
  Search,
  Filter,
  Calendar,
  Warehouse,
  Eye,
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  History,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight,
  LockKeyhole,
  Clock,
  ArrowUpDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface CierreData {
  id: string;
  estado: string;
  bodegaId: string | null;
  bodega?: { id: string; nombre: string } | null;
  fechaInicio: string;
  fechaFin: string;
  valorInicial: number;
  valorFinal: number;
  diferencia: number;
  notas: string | null;
  usuarioId: string;
  usuario?: { id: string; nombre: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface MovimientoPreview {
  id: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  producto: { id: string; nombre: string; codigo: string };
}

interface BodegaOption {
  id: string;
  nombre: string;
}

const cierreSchema = z.object({
  fechaInicio: z.string().min(1, "La fecha de inicio es obligatoria"),
  fechaFin: z.string().min(1, "La fecha de fin es obligatoria"),
  bodegaId: z.string().optional(),
  notas: z.string().max(500).optional(),
});

type CierreFormValues = z.infer<typeof cierreSchema>;

export default function CierresPage() {
  const [cierres, setCierres] = useState<CierreData[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBodega, setFilterBodega] = useState<string>("ALL");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCierre, setSelectedCierre] = useState<CierreData | null>(null);
  const [previewMovimientos, setPreviewMovimientos] = useState<MovimientoPreview[]>([]);
  const [previewValorInicial, setPreviewValorInicial] = useState(0);
  const [previewValorFinal, setPreviewValorFinal] = useState(0);

  const createForm = useForm<CierreFormValues>({
    resolver: zodResolver(cierreSchema),
    defaultValues: {
      fechaInicio: "",
      fechaFin: "",
      bodegaId: "",
      notas: "",
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cierresRes, bodRes] = await Promise.all([
        fetch("/api/cierres?limit=200"),
        fetch("/api/bodegas?activa=true&limit=100"),
      ]);

      const [cData, bData] = await Promise.all([
        cierresRes.json(),
        bodRes.json(),
      ]);

      if (cData.success) setCierres(cData.data || []);
      if (bData.success) setBodegas(bData.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCierres = useMemo(() => {
    return cierres.filter((c) => {
      if (filterBodega !== "ALL" && c.bodegaId !== filterBodega) return false;
      return true;
    });
  }, [cierres, filterBodega]);

  const sortedCierres = useMemo(() => {
    return [...filteredCierres].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredCierres]);

  const chartData = useMemo(() => {
    const sorted = [...sortedCierres]
      .sort((a, b) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime())
      .map((c) => ({
        periodo: format(new Date(c.fechaFin), "MMM yy", { locale: es }),
        valorFinal: c.valorFinal,
        valorInicial: c.valorInicial,
        diferencia: c.diferencia,
      }));
    return sorted;
  }, [sortedCierres]);

  const stats = useMemo(() => {
    const total = cierres.length;
    const ultimoCierre = sortedCierres[0];
    const valorTotalPeriodos = cierres.reduce((s, c) => s + c.valorFinal, 0);
    const diferenciaTotal = cierres.reduce((s, c) => s + c.diferencia, 0);
    return {
      total,
      ultimoCierre,
      valorTotalPeriodos,
      diferenciaTotal,
    };
  }, [cierres, sortedCierres]);

  const handlePreviewCierre = async (data: CierreFormValues) => {
    try {
      const params = new URLSearchParams();
      params.set("fechaInicio", data.fechaInicio);
      params.set("fechaFin", data.fechaFin);
      if (data.bodegaId) params.set("bodegaId", data.bodegaId);
      params.set("preview", "true");

      const res = await fetch(`/api/cierres/preview?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setPreviewMovimientos(json.data?.movimientos || []);
        setPreviewValorInicial(json.data?.valorInicial || 0);
        setPreviewValorFinal(json.data?.valorFinal || 0);
      } else {
        setPreviewMovimientos([]);
        setPreviewValorInicial(0);
        setPreviewValorFinal(0);
      }
    } catch (err) {
      console.error("Error preview:", err);
    }
    setShowPreviewModal(true);
  };

  const handleCreateCierre = async (data: CierreFormValues) => {
    setCreating(true);
    try {
      const res = await fetch("/api/cierres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setShowPreviewModal(false);
        createForm.reset();
        fetchData();
      } else {
        console.error("Error:", json.error);
      }
    } catch (err) {
      console.error("Error creating cierre:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleViewDetail = async (cierre: CierreData) => {
    setSelectedCierre(cierre);
    try {
      const res = await fetch(`/api/cierres?id=${cierre.id}`);
      const json = await res.json();
      if (json.success) {
        setPreviewMovimientos(json.data?.movimientos || []);
      }
    } catch (err) {
      console.error("Error loading detail:", err);
    }
    setShowDetailModal(true);
  };

  const exportReport = async (cierre: CierreData) => {
    const res = await fetch(`/api/cierres?id=${cierre.id}`);
    const json = await res.json();
    const movimientos: MovimientoPreview[] = json.success ? json.data?.movimientos || [] : [];

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte de Cierre de Inventario", 14, 20);
    doc.setFontSize(10);
    doc.text(`ID: ${cierre.id.slice(0, 12)}`, 14, 28);
    doc.text(`Bodega: ${cierre.bodega?.nombre || "Todas"}`, 14, 34);
    doc.text(
      `Período: ${format(new Date(cierre.fechaInicio), "dd/MM/yyyy")} - ${format(new Date(cierre.fechaFin), "dd/MM/yyyy")}`,
      14,
      40
    );
    doc.text(`Valor Inicial: ${formatCurrency(cierre.valorInicial)}`, 14, 46);
    doc.text(`Valor Final: ${formatCurrency(cierre.valorFinal)}`, 14, 52);
    doc.text(`Diferencia: ${formatCurrency(cierre.diferencia)}`, 14, 58);
    if (cierre.notas) {
      doc.text(`Notas: ${cierre.notas}`, 14, 64);
    }

    const tableRows = movimientos.map((m) => [
      format(new Date(m.fecha), "dd/MM/yy"),
      m.tipo,
      m.producto?.codigo || "N/A",
      m.producto?.nombre || "N/A",
      m.cantidad.toString(),
    ]);

    (doc as any).autoTable({
      startY: cierre.notas ? 70 : 64,
      head: [["Fecha", "Tipo", "Código", "Producto", "Cantidad"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`cierre_${cierre.id.slice(0, 8)}.pdf`);
  };

  if (loading) {
    return (
      <div className="cosmic-bg min-h-screen">
        <div className="cosmic-grid" />
        <div className="relative z-10 space-y-6 p-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
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
                <LockKeyhole className="h-8 w-8 text-primary" />
                Cierres de Inventario
              </h1>
              <p className="mt-1 text-muted-foreground">
                Cierre de períodos contables y consolidación de inventario
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="shimmer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cierre
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription>Total Cierres</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary">Último Cierre</CardDescription>
              <CardTitle className="text-lg">
                {stats.ultimoCierre
                  ? format(new Date(stats.ultimoCierre.fechaFin), "MMM yyyy", { locale: es })
                  : "N/A"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-400">Valor Total Periodos</CardDescription>
              <CardTitle className="text-2xl text-emerald-400">
                {formatCurrency(stats.valorTotalPeriodos)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className={stats.diferenciaTotal >= 0 ? "text-emerald-400" : "text-red-400"}>
                Diferencia Acumulada
              </CardDescription>
              <CardTitle className={`text-2xl ${stats.diferenciaTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {formatCurrency(stats.diferenciaTotal)}
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Evolución del Valor de Inventario
              </CardTitle>
              <CardDescription>
                Valor final por período de cierre
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 opacity-20" />
                  <p className="mt-2 text-sm">No hay datos para mostrar</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(239 84% 67%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 20%)" />
                    <XAxis dataKey="periodo" stroke="hsl(215 20.2% 65.1%)" fontSize={12} />
                    <YAxis
                      stroke="hsl(215 20.2% 65.1%)"
                      fontSize={12}
                      tickFormatter={(v: number) =>
                        v >= 1000000
                          ? `${(v / 1000000).toFixed(1)}M`
                          : v >= 1000
                          ? `${(v / 1000).toFixed(0)}K`
                          : v.toString()
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240 15% 8%)",
                        border: "1px solid hsl(240 15% 20%)",
                        borderRadius: "8px",
                        color: "hsl(210 40% 98%)",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Valor Final"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="valorFinal"
                      name="Valor Final"
                      stroke="hsl(239 84% 67%)"
                      strokeWidth={2}
                      fill="url(#colorValor)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historial de Cierres
                </CardTitle>
                <Select value={filterBodega} onValueChange={setFilterBodega}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    {bodegas.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Valor Inicial</TableHead>
                      <TableHead className="text-right">Valor Final</TableHead>
                      <TableHead className="text-right">Diferencia</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha Cierre</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCierres.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                          No se encontraron cierres
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCierres.map((cierre) => (
                        <TableRow key={cierre.id} className="group hover:bg-muted/50">
                          <TableCell className="whitespace-nowrap">
                            <span className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(cierre.fechaInicio), "dd/MM/yy")} -{" "}
                                {format(new Date(cierre.fechaFin), "dd/MM/yy")}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <Warehouse className="h-3.5 w-3.5 text-muted-foreground" />
                              {cierre.bodega?.nombre || "Todas"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cierre.estado === "CERRADO" ? "default" : "success"
                              }
                            >
                              {cierre.estado === "CERRADO" ? "Cerrado" : cierre.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(cierre.valorInicial)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap font-medium">
                            {formatCurrency(cierre.valorFinal)}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span
                              className={
                                cierre.diferencia >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }
                            >
                              {cierre.diferencia >= 0 ? "+" : ""}
                              {formatCurrency(cierre.diferencia)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            {cierre.usuario?.nombre || "N/A"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(cierre.createdAt), "dd/MM/yy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(cierre)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => exportReport(cierre)}
                                title="Exportar reporte"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              Nuevo Cierre de Inventario
            </DialogTitle>
            <DialogDescription>
              Defina el período y la bodega para el cierre. Los movimientos en este período quedarán bloqueados.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createForm.handleSubmit(handlePreviewCierre)(e);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Fecha Inicio</Label>
                <Controller
                  name="fechaInicio"
                  control={createForm.control}
                  render={({ field }) => <Input type="date" {...field} />}
                />
                {createForm.formState.errors.fechaInicio && (
                  <p className="mt-1 text-xs text-destructive">
                    {createForm.formState.errors.fechaInicio.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Fecha Fin</Label>
                <Controller
                  name="fechaFin"
                  control={createForm.control}
                  render={({ field }) => <Input type="date" {...field} />}
                />
                {createForm.formState.errors.fechaFin && (
                  <p className="mt-1 text-xs text-destructive">
                    {createForm.formState.errors.fechaFin.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Bodega (opcional - dejar vacío para todas)</Label>
              <Controller
                name="bodegaId"
                control={createForm.control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las bodegas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las bodegas</SelectItem>
                      {bodegas.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Controller
                name="notas"
                control={createForm.control}
                render={({ field }) => (
                  <Textarea
                    placeholder="Notas del cierre..."
                    className="min-h-[60px] resize-none"
                    {...field}
                  />
                )}
              />
            </div>

            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-400 flex-shrink-0" />
                <div className="text-xs text-amber-300">
                  Los movimientos en el período cerrado no podrán ser modificados. Asegúrese de que
                  toda la información esté correcta antes de proceder.
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Eye className="mr-2 h-4 w-4" />
                Vista Previa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Vista Previa del Cierre
            </DialogTitle>
            <DialogDescription>
              Revise los movimientos y valores antes de confirmar el cierre
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Valor Inicial</div>
                <div className="text-lg font-bold">{formatCurrency(previewValorInicial)}</div>
              </Card>
              <Card className="bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Valor Final</div>
                <div className="text-lg font-bold">{formatCurrency(previewValorFinal)}</div>
              </Card>
              <Card className="bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Diferencia</div>
                <div
                  className={`text-lg font-bold ${
                    previewValorFinal - previewValorInicial >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(previewValorFinal - previewValorInicial)}
                </div>
              </Card>
            </div>

            <div className="max-h-48 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewMovimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                        Sin movimientos en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewMovimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(m.fecha), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.tipo === "ENTRADA"
                                ? "success"
                                : m.tipo === "SALIDA"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px]"
                          >
                            {m.tipo.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.producto?.codigo} - {m.producto?.nombre}
                        </TableCell>
                        <TableCell className="text-right text-xs">{m.cantidad}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const data = createForm.getValues();
                handleCreateCierre(data);
              }}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              Confirmar y Cerrar Período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalle del Cierre
            </DialogTitle>
          </DialogHeader>
          {selectedCierre && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Período</span>
                  <p>
                    {format(new Date(selectedCierre.fechaInicio), "dd/MM/yyyy")} -{" "}
                    {format(new Date(selectedCierre.fechaFin), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Bodega</span>
                  <p>{selectedCierre.bodega?.nombre || "Todas"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Valor Inicial</span>
                  <p className="font-bold">{formatCurrency(selectedCierre.valorInicial)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Valor Final</span>
                  <p className="font-bold">{formatCurrency(selectedCierre.valorFinal)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Diferencia</span>
                  <p
                    className={`font-bold ${
                      selectedCierre.diferencia >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatCurrency(selectedCierre.diferencia)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <p>
                    <Badge variant="default">
                      {selectedCierre.estado === "CERRADO" ? "Cerrado" : selectedCierre.estado}
                    </Badge>
                  </p>
                </div>
              </div>
              {selectedCierre.notas && (
                <div>
                  <span className="text-xs text-muted-foreground">Notas</span>
                  <p className="text-sm">{selectedCierre.notas}</p>
                </div>
              )}
              <div className="max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewMovimientos.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(m.fecha), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              m.tipo === "ENTRADA"
                                ? "success"
                                : m.tipo === "SALIDA"
                                ? "destructive"
                                : "warning"
                            }
                            className="text-[10px]"
                          >
                            {m.tipo.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.producto?.codigo} - {m.producto?.nombre}
                        </TableCell>
                        <TableCell className="text-right text-xs">{m.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
