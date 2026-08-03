"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Calendar,
  Warehouse,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ScanLine,
  ClipboardCheck,
  FileText,
  Download,
  Trash2,
  Pencil,
  Eye,
  Play,
  BarChart3,
  Percent,
  Hash,
  Package,
  ChevronDown,
  ArrowUpDown,
  RefreshCw,
  Camera,
} from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

type ConteoEstado = "ABIERTO" | "EN_PROCESO" | "CERRADO" | "CONCILIADO";

interface ConteoData {
  id: string;
  estado: ConteoEstado;
  bodegaId: string;
  bodega: { id: string; nombre: string };
  usuarioId: string;
  usuario: { id: string; nombre: string };
  notas: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  createdAt: string;
  items?: ConteoItemData[];
  _count?: { items: number };
}

interface ConteoItemData {
  id: string;
  conteoId: string;
  productoId: string;
  producto: { id: string; nombre: string; codigo: string; codigoBarras: string | null } | null;
  cantidadSistema: number;
  cantidadFisica: number;
  diferencia: number;
  notas: string | null;
}

interface BodegaOption {
  id: string;
  nombre: string;
}

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  codigoBarras: string | null;
}

const nuevoConteoSchema = z.object({
  bodegaId: z.string().min(1, "Seleccione una bodega"),
  tipoConteo: z.enum(["COMPLETO", "CICLICO", "ALEATORIO"]),
  categoriaId: z.string().optional(),
  frecuencia: z.enum(["DIARIO", "SEMANAL", "MENSUAL"]).optional(),
  muestraPorcentaje: z.number().min(1).max(100).optional(),
  notas: z.string().max(500).optional(),
});

type NuevoConteoValues = z.infer<typeof nuevoConteoSchema>;

const estadoBadgeVariant: Record<ConteoEstado, "default" | "warning" | "success" | "outline"> = {
  ABIERTO: "outline",
  EN_PROCESO: "warning",
  CERRADO: "default",
  CONCILIADO: "success",
};

const estadoLabel: Record<ConteoEstado, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En Proceso",
  CERRADO: "Cerrado",
  CONCILIADO: "Conciliado",
};

export default function ConteosPage() {
  const [conteos, setConteos] = useState<ConteoData[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nombre: string }[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("ALL");
  const [filterBodega, setFilterBodega] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedConteo, setSelectedConteo] = useState<ConteoData | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [conteoItems, setConteoItems] = useState<ConteoItemData[]>([]);
  const [physicalQuantities, setPhysicalQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const createForm = useForm<NuevoConteoValues>({
    resolver: zodResolver(nuevoConteoSchema),
    defaultValues: {
      bodegaId: "",
      tipoConteo: "COMPLETO",
      notas: "",
    },
  });

  const tipoConteo = createForm.watch("tipoConteo");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [conteosRes, bodRes, catRes, prodRes] = await Promise.all([
        fetch("/api/conteos?limit=200"),
        fetch("/api/bodegas?activa=true&limit=100"),
        fetch("/api/categorias?limit=200"),
        fetch("/api/productos?limit=500&estado=ACTIVO"),
      ]);

      const [cData, bData, catData, pData] = await Promise.all([
        conteosRes.json(),
        bodRes.json(),
        catRes.json(),
        prodRes.json(),
      ]);

      if (cData.success) setConteos(cData.data || []);
      if (bData.success) setBodegas(bData.data || []);
      if (catData.success) setCategorias(catData.data || []);
      if (pData.success) setProductos(pData.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredConteos = useMemo(() => {
    return conteos.filter((c) => {
      if (filterEstado !== "ALL" && c.estado !== filterEstado) return false;
      if (filterBodega !== "ALL" && c.bodegaId !== filterBodega) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (c.bodega?.nombre || "").toLowerCase().includes(q) ||
          c.notas?.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [conteos, filterEstado, filterBodega, searchQuery]);

  const handleCreateConteo = async (data: NuevoConteoValues) => {
    setCreating(true);
    try {
      let itemsForConteo: {
        productoId: string;
        cantidadSistema: number;
        cantidadFisica: number;
        notas: string | null;
      }[] = [];

      const invRes = await fetch(
        `/api/inventario?bodegaId=${data.bodegaId}&limit=5000`
      );
      const invData = await invRes.json();
      const inventario = invData.success ? invData.data || [] : [];

      if (data.tipoConteo === "COMPLETO") {
        itemsForConteo = inventario.map((inv: any) => ({
          productoId: inv.productoId,
          cantidadSistema: inv.cantidad,
          cantidadFisica: 0,
          notas: null,
        }));
      } else if (data.tipoConteo === "CICLICO" && data.categoriaId) {
        itemsForConteo = inventario
          .filter((inv: any) => {
            const prod = productos.find((p) => p.id === inv.productoId);
            return prod && (prod as any).categoriaId === data.categoriaId;
          })
          .map((inv: any) => ({
            productoId: inv.productoId,
            cantidadSistema: inv.cantidad,
            cantidadFisica: 0,
            notas: null,
          }));
      } else if (data.tipoConteo === "ALEATORIO") {
        const shuffled = [...inventario].sort(() => 0.5 - Math.random());
        const sampleSize = Math.ceil(
          inventario.length * ((data.muestraPorcentaje || 10) / 100)
        );
        itemsForConteo = shuffled.slice(0, sampleSize).map((inv: any) => ({
          productoId: inv.productoId,
          cantidadSistema: inv.cantidad,
          cantidadFisica: 0,
          notas: null,
        }));
      }

      const payload = {
        bodegaId: data.bodegaId,
        usuarioId: "current",
        notas: data.notas || null,
        items: itemsForConteo,
      };

      const res = await fetch("/api/conteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        createForm.reset();
        fetchData();
      } else {
        console.error("Error creating conteo:", json.error);
      }
    } catch (err) {
      console.error("Error creating conteo:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleStartConteo = async (conteo: ConteoData) => {
    setSelectedConteo(conteo);
    try {
      const res = await fetch(`/api/conteos?id=${conteo.id}`);
      const json = await res.json();
      if (json.success) {
        const items = json.data?.items || [];
        setConteoItems(items);
        setPhysicalQuantities({});
        setItemNotes({});

        for (const item of items) {
          setPhysicalQuantities((prev) => ({
            ...prev,
            [item.id]: item.cantidadFisica,
          }));
          setItemNotes((prev) => ({
            ...prev,
            [item.id]: item.notas || "",
          }));
        }

        await fetch(`/api/conteos/${conteo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "EN_PROCESO" }),
        });
      }
    } catch (err) {
      console.error("Error loading conteo items:", err);
    }
    setShowExecuteModal(true);
  };

  const handleScanBarcode = () => {
    if (!barcodeInput.trim()) return;
    const foundProduct = productos.find(
      (p) =>
        p.codigoBarras === barcodeInput.trim() ||
        p.codigo === barcodeInput.trim()
    );
    if (foundProduct) {
      const item = conteoItems.find((i) => i.productoId === foundProduct.id);
      if (item) {
        setPhysicalQuantities((prev) => ({
          ...prev,
          [item.id]: (prev[item.id] || 0) + 1,
        }));
      }
    }
    setBarcodeInput("");
  };

  const handleSaveConteo = async () => {
    if (!selectedConteo) return;
    setExecuting(true);
    try {
      const itemsToSave = conteoItems.map((item) => {
        const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
        return {
          id: item.id,
          productoId: item.productoId,
          cantidadSistema: item.cantidadSistema,
          cantidadFisica: fisica,
          diferencia: fisica - item.cantidadSistema,
          notas: itemNotes[item.id] || null,
        };
      });

      await fetch(`/api/conteos/${selectedConteo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "CERRADO",
          items: itemsToSave,
        }),
      });

      setShowExecuteModal(false);
      setSelectedConteo(null);
      setConteoItems([]);
      fetchData();
    } catch (err) {
      console.error("Error saving conteo:", err);
    } finally {
      setExecuting(false);
    }
  };

  const handleOpenReconcile = (conteo: ConteoData) => {
    setSelectedConteo(conteo);
    setShowReconcileModal(true);
  };

  const handleReconcile = async () => {
    if (!selectedConteo) return;
    setReconciling(true);
    try {
      const res = await fetch(`/api/conteos/${selectedConteo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: "CONCILIADO",
          aplicarAjustes: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowReconcileModal(false);
        setSelectedConteo(null);
        fetchData();
      }
    } catch (err) {
      console.error("Error reconciling:", err);
    } finally {
      setReconciling(false);
    }
  };

  const handleViewDetail = async (conteo: ConteoData) => {
    setSelectedConteo(conteo);
    try {
      const res = await fetch(`/api/conteos?id=${conteo.id}`);
      const json = await res.json();
      if (json.success) {
        setConteoItems(json.data?.items || []);
      }
    } catch (err) {
      console.error("Error loading detail:", err);
    }
    setShowDetailModal(true);
  };

  const exportToPDF = async (conteo: ConteoData) => {
    const res = await fetch(`/api/conteos?id=${conteo.id}`);
    const json = await res.json();
    const items: ConteoItemData[] = json.success ? json.data?.items || [] : [];

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte de Conteo Físico", 14, 20);
    doc.setFontSize(10);
    doc.text(`ID: ${conteo.id}`, 14, 28);
    doc.text(`Bodega: ${conteo.bodega?.nombre || "N/A"}`, 14, 34);
    doc.text(`Estado: ${estadoLabel[conteo.estado]}`, 14, 40);
    doc.text(`Fecha: ${format(new Date(conteo.createdAt), "dd/MM/yyyy HH:mm")}`, 14, 46);

    const tableRows = items.map((item) => [
      item.producto?.codigo || "N/A",
      item.producto?.nombre || "N/A",
      item.cantidadSistema.toString(),
      item.cantidadFisica.toString(),
      item.diferencia.toString(),
      item.diferencia !== 0 ? (item.diferencia > 0 ? "SOBRANTE" : "FALTANTE") : "OK",
    ]);

    (doc as any).autoTable({
      startY: 52,
      head: [["Código", "Producto", "Sistema", "Físico", "Dif.", "Estado"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`conteo_${conteo.id.slice(0, 8)}.pdf`);
  };

  const stats = useMemo(() => {
    const totalConteos = conteos.length;
    const activos = conteos.filter((c) => c.estado === "ABIERTO" || c.estado === "EN_PROCESO").length;
    const conciliados = conteos.filter((c) => c.estado === "CONCILIADO").length;
    const totalItems = conteos.reduce((s, c) => s + (c._count?.items || 0), 0);
    return { totalConteos, activos, conciliados, totalItems };
  }, [conteos]);

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
                <ClipboardCheck className="h-8 w-8 text-primary" />
                Conteos Físicos
              </h1>
              <p className="mt-1 text-muted-foreground">
                Gestión de inventarios físicos, conciliación y ajustes
              </p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="shimmer">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Conteo
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
              <CardDescription>Total Conteos</CardDescription>
              <CardTitle className="text-2xl">{stats.totalConteos}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-400">Activos</CardDescription>
              <CardTitle className="text-2xl text-amber-400">{stats.activos}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-emerald-400">Conciliados</CardDescription>
              <CardTitle className="text-2xl text-emerald-400">{stats.conciliados}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription>Total Items Contados</CardDescription>
              <CardTitle className="text-2xl">{stats.totalItems}</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Historial de Conteos</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="w-48 pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="ABIERTO">Abierto</SelectItem>
                      <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                      <SelectItem value="CERRADO">Cerrado</SelectItem>
                      <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                    </SelectContent>
                  </Select>
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
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Bodega</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConteos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No se encontraron conteos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConteos.map((conteo) => (
                        <TableRow key={conteo.id} className="group hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            {conteo.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <Warehouse className="h-4 w-4 text-muted-foreground" />
                              {conteo.bodega?.nombre || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={estadoBadgeVariant[conteo.estado]}>
                              {estadoLabel[conteo.estado]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {conteo._count?.items || 0}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(conteo.fechaInicio), "dd/MM/yy")}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {conteo.fechaFin
                              ? format(new Date(conteo.fechaFin), "dd/MM/yy")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {conteo.usuario?.nombre || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(conteo)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(conteo.estado === "ABIERTO" ||
                                conteo.estado === "EN_PROCESO") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-400"
                                  onClick={() => handleStartConteo(conteo)}
                                  title="Ejecutar conteo"
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              {conteo.estado === "CERRADO" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-400"
                                    onClick={() => handleOpenReconcile(conteo)}
                                    title="Conciliar"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => exportToPDF(conteo)}
                                    title="Exportar PDF"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {conteo.estado === "CONCILIADO" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => exportToPDF(conteo)}
                                  title="Exportar PDF"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
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
              <ClipboardList className="h-5 w-5 text-primary" />
              Nuevo Conteo Físico
            </DialogTitle>
            <DialogDescription>
              Configure los parámetros para iniciar un nuevo conteo de inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateConteo)} className="space-y-4">
            <div>
              <Label>Bodega</Label>
              <Controller
                name="bodegaId"
                control={createForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
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
              {createForm.formState.errors.bodegaId && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.bodegaId.message}
                </p>
              )}
            </div>

            <div>
              <Label>Tipo de Conteo</Label>
              <Controller
                name="tipoConteo"
                control={createForm.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLETO">Completo (todos los productos)</SelectItem>
                      <SelectItem value="CICLICO">Cíclico (por categoría)</SelectItem>
                      <SelectItem value="ALEATORIO">Aleatorio (muestreo)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {tipoConteo === "CICLICO" && (
              <>
                <div>
                  <Label>Categoría</Label>
                  <Controller
                    name="categoriaId"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Frecuencia</Label>
                  <Controller
                    name="frecuencia"
                    control={createForm.control}
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar frecuencia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DIARIO">Diario</SelectItem>
                          <SelectItem value="SEMANAL">Semanal</SelectItem>
                          <SelectItem value="MENSUAL">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </>
            )}

            {tipoConteo === "ALEATORIO" && (
              <div>
                <Label>Porcentaje de Muestra (%)</Label>
                <Controller
                  name="muestraPorcentaje"
                  control={createForm.control}
                  render={({ field }) => (
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="10"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  )}
                />
              </div>
            )}

            <div>
              <Label>Notas (opcional)</Label>
              <Controller
                name="notas"
                control={createForm.control}
                render={({ field }) => (
                  <Textarea
                    placeholder="Notas del conteo..."
                    className="min-h-[80px] resize-none"
                    {...field}
                  />
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Crear Conteo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Ejecutar Conteo
            </DialogTitle>
            <DialogDescription>
              {selectedConteo?.bodega?.nombre} - Ingrese las cantidades físicas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Escanear código de barras..."
                  className="pl-10"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScanBarcode();
                    }
                  }}
                />
              </div>
              <Button variant="outline" onClick={handleScanBarcode}>
                <Camera className="mr-2 h-4 w-4" />
                Escanear
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Sistema</TableHead>
                    <TableHead className="text-right">Físico</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="w-[200px]">Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conteoItems.map((item) => {
                    const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
                    const diferencia = fisica - item.cantidadSistema;
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          diferencia !== 0 && "bg-red-500/5 dark:bg-red-500/5"
                        )}
                      >
                        <TableCell className="font-mono text-xs">
                          {item.producto?.codigo || "N/A"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {item.producto?.nombre || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.cantidadSistema}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            className="w-24 text-right"
                            value={fisica}
                            onChange={(e) =>
                              setPhysicalQuantities((prev) => ({
                                ...prev,
                                [item.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {diferencia !== 0 ? (
                            <Badge
                              variant={diferencia > 0 ? "success" : "destructive"}
                            >
                              {diferencia > 0 ? "+" : ""}
                              {diferencia}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            placeholder="Nota..."
                            value={itemNotes[item.id] || ""}
                            onChange={(e) =>
                              setItemNotes((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConteo} disabled={executing}>
              {executing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Finalizar y Cerrar Conteo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReconcileModal} onOpenChange={setShowReconcileModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-400" />
              Conciliar Conteo
            </DialogTitle>
            <DialogDescription>
              Se crearán movimientos de ajuste para las diferencias encontradas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const itemsWithDiff = conteoItems.filter((i) => {
                const fisica = physicalQuantities[i.id] ?? i.cantidadFisica;
                return fisica !== i.cantidadSistema;
              });
              const totalItems = conteoItems.length;
              const countedItems = conteoItems.length;
              const diffItems = itemsWithDiff.length;
              const accuracy =
                totalItems > 0
                  ? ((totalItems - diffItems) / totalItems) * 100
                  : 0;

              return (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Total Items</div>
                      <div className="text-xl font-bold">{totalItems}</div>
                    </Card>
                    <Card className="bg-muted/30 p-3">
                      <div className="text-xs text-muted-foreground">Contados</div>
                      <div className="text-xl font-bold">{countedItems}</div>
                    </Card>
                    <Card className="bg-muted/30 p-3">
                      <div className="text-xs text-amber-400">Diferencias</div>
                      <div className="text-xl font-bold text-amber-400">{diffItems}</div>
                    </Card>
                    <Card className="bg-muted/30 p-3">
                      <div className="text-xs text-emerald-400">Precisión</div>
                      <div className="text-xl font-bold text-emerald-400">{accuracy.toFixed(1)}%</div>
                    </Card>
                  </div>

                  {itemsWithDiff.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-white/10 bg-muted/20 p-2">
                      {itemsWithDiff.map((item) => {
                        const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
                        const dif = fisica - item.cantidadSistema;
                        return (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">
                              {item.producto?.codigo} - {item.producto?.nombre}
                            </span>
                            <Badge variant={dif > 0 ? "success" : "destructive"} className="text-[10px]">
                              {dif > 0 ? "+" : ""}
                              {dif}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcileModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReconcile} disabled={reconciling}>
              {reconciling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Aplicar Ajustes y Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalle del Conteo
            </DialogTitle>
            {selectedConteo && (
              <DialogDescription>
                {selectedConteo.bodega?.nombre} - {estadoLabel[selectedConteo.estado]} -{" "}
                {format(new Date(selectedConteo.createdAt), "dd/MM/yyyy HH:mm")}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Sistema</TableHead>
                  <TableHead className="text-right">Físico</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conteoItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      item.diferencia !== 0 && "bg-red-500/5"
                    )}
                  >
                    <TableCell className="font-mono text-xs">
                      {item.producto?.codigo || "N/A"}
                    </TableCell>
                    <TableCell>{item.producto?.nombre || "N/A"}</TableCell>
                    <TableCell className="text-right">{item.cantidadSistema}</TableCell>
                    <TableCell className="text-right">{item.cantidadFisica}</TableCell>
                    <TableCell className="text-right">
                      {item.diferencia !== 0 ? (
                        <Badge variant={item.diferencia > 0 ? "success" : "destructive"}>
                          {item.diferencia > 0 ? "+" : ""}
                          {item.diferencia}
                        </Badge>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.notas || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
