"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList, Plus, Search, Warehouse, CheckCircle, Loader2,
  ScanLine, ClipboardCheck, Download, RefreshCw, Pause, Play,
  BarChart3, Percent, Hash, Package, ChevronLeft, Camera, XCircle,
  AlertTriangle, FileText, Eye, RotateCcw, ArrowRight, Info,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useAuth } from "@/components/providers";

type ConteoEstado = "ABIERTO" | "EN_PROCESO" | "PAUSADO" | "CERRADO" | "CONCILIADO";

interface ConteoData {
  id: string;
  estado: ConteoEstado;
  bodegaId: string;
  bodega: { id: string; nombre: string };
  usuario: { id: string; nombre: string };
  notas: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  itemsCount: number;
  diferencias: number;
  createdAt: string;
  items?: ConteoItemData[];
}

interface ConteoItemData {
  id: string;
  producto: { id: string; codigo: string; nombre: string; codigoBarras?: string | null; imagen?: string | null };
  cantidadSistema: number;
  cantidadFisica: number;
  diferencia: number;
  notas: string | null;
}

interface BodegaOption { id: string; nombre: string; }
interface ProductoOption { id: string; codigo: string; nombre: string; codigoBarras: string | null; imagen: string | null; }

const nuevoConteoSchema = z.object({
  bodegaId: z.string().min(1, "Seleccione una bodega"),
  tipoConteo: z.enum(["COMPLETO", "PARCIAL"]),
  notas: z.string().max(500).optional(),
});

type NuevoConteoValues = z.infer<typeof nuevoConteoSchema>;

const estadoBadgeVariant: Record<ConteoEstado, "default" | "warning" | "success" | "outline" | "destructive"> = {
  ABIERTO: "outline",
  EN_PROCESO: "warning",
  PAUSADO: "outline",
  CERRADO: "default",
  CONCILIADO: "success",
};

const estadoLabel: Record<ConteoEstado, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En Proceso",
  PAUSADO: "Pausado",
  CERRADO: "Cerrado",
  CONCILIADO: "Conciliado",
};

export default function ConteosPage() {
  const { user } = useAuth();
  const [conteos, setConteos] = useState<ConteoData[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
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
  const [showClosedViewModal, setShowClosedViewModal] = useState(false);
  const [detailItems, setDetailItems] = useState<ConteoItemData[]>([]);

  const [conteoItems, setConteoItems] = useState<ConteoItemData[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [physicalQuantities, setPhysicalQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  const createForm = useForm<NuevoConteoValues>({
    resolver: zodResolver(nuevoConteoSchema),
    defaultValues: { bodegaId: "", tipoConteo: "COMPLETO", notas: "" },
  });

  const tipoConteo = createForm.watch("tipoConteo");

  const barcodeScanner = useBarcodeScanner({
    autoStop: false,
    scannerElementId: "barcode-scanner-camera",
    onScan: (barcode: string) => {
      handleBarcodeScanned(barcode);
    },
    onError: (err) => {
      toast.error("Error de escáner: " + err);
    },
  });

  const handleBarcodeScanned = useCallback((barcode: string) => {
    if (!barcode.trim() || isPaused) return;
    const foundProduct = productos.find(
      (p) => p.codigoBarras === barcode.trim() || p.codigo === barcode.trim()
    );
    if (foundProduct) {
      const idx = conteoItems.findIndex((i) => i.producto.id === foundProduct.id);
      if (idx >= 0) {
        setCurrentItemIndex(idx);
        toast.success(`Producto encontrado: ${foundProduct.nombre}`);
      } else {
        toast.error("Producto no incluido en este conteo");
      }
    } else {
      toast.error(`Código no reconocido: ${barcode}`);
    }
  }, [productos, conteoItems, isPaused]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [conteosRes, bodRes, prodRes] = await Promise.all([
        fetch("/api/conteos?limit=200"),
        fetch("/api/bodegas?activa=true&limit=100"),
        fetch("/api/productos?limit=1000&estado=ACTIVO"),
      ]);
      const [cData, bData, pData] = await Promise.all([
        conteosRes.json(),
        bodRes.json(),
        prodRes.json(),
      ]);
      if (cData.success) setConteos(cData.data || []);
      if (bData.success) setBodegas(bData.data || []);
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
      const res = await fetch("/api/conteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodegaId: data.bodegaId,
          notas: data.notas || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        createForm.reset();
        toast.success("Conteo creado exitosamente");
        fetchData();
      } else {
        toast.error(json.error || "Error al crear conteo");
      }
    } catch (err) {
      console.error("Error creating conteo:", err);
      toast.error("Error al crear conteo");
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
        const phi: Record<string, number> = {};
        const notes: Record<string, string> = {};
        for (const item of items) {
          phi[item.id] = item.cantidadFisica;
          notes[item.id] = item.notas || "";
        }
        setPhysicalQuantities(phi);
        setItemNotes(notes);
        setCurrentItemIndex(0);
        setIsPaused(false);

        await fetch(`/api/conteos/${conteo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "EN_PROCESO" }),
        });
      }
    } catch (err) {
      console.error("Error loading conteo items:", err);
      toast.error("Error al cargar items del conteo");
    }
    setShowExecuteModal(true);
  };

  const handleConfirmCurrent = useCallback(async () => {
    if (!selectedConteo) return;
    const currentItem = conteoItems[currentItemIndex];
    if (!currentItem) return;

    const fisica = physicalQuantities[currentItem.id] ?? currentItem.cantidadFisica;
    const diferencia = fisica - currentItem.cantidadSistema;

    setConteoItems((prev) =>
      prev.map((item) =>
        item.id === currentItem.id
          ? { ...item, cantidadFisica: fisica, diferencia }
          : item
      )
    );

    if (currentItemIndex < conteoItems.length - 1) {
      setCurrentItemIndex((i) => i + 1);
    } else {
      toast.success("Todos los items han sido contados!");
    }
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, [selectedConteo, conteoItems, currentItemIndex, physicalQuantities]);

  const handlePause = async () => {
    if (!selectedConteo) return;
    try {
      await saveCurrentProgress();
      await fetch(`/api/conteos/${selectedConteo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "PAUSADO" }),
      });
      setIsPaused(true);
      toast.success("Conteo pausado");
    } catch {
      toast.error("Error al pausar");
    }
  };

  const handleResume = async () => {
    if (!selectedConteo) return;
    try {
      await fetch(`/api/conteos/${selectedConteo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EN_PROCESO" }),
      });
      setIsPaused(false);
      toast.success("Conteo reanudado");
    } catch {
      toast.error("Error al reanudar");
    }
  };

  const saveCurrentProgress = async () => {
    if (!selectedConteo) return;
    try {
      const itemsToSave = conteoItems.map((item) => {
        const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
        return {
          id: item.id,
          productoId: item.producto.id,
          cantidadSistema: item.cantidadSistema,
          cantidadFisica: fisica,
          diferencia: fisica - item.cantidadSistema,
          notas: itemNotes[item.id] || null,
        };
      });
      await fetch(`/api/conteos/${selectedConteo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  const handleFinalizar = async () => {
    if (!selectedConteo) return;
    setExecuting(true);
    try {
      const itemsToSave = conteoItems.map((item) => {
        const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
        return {
          id: item.id,
          productoId: item.producto.id,
          cantidadSistema: item.cantidadSistema,
          cantidadFisica: fisica,
          diferencia: fisica - item.cantidadSistema,
          notas: itemNotes[item.id] || null,
        };
      });

      const res = await fetch(`/api/conteos/${selectedConteo.id}/cerrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Conteo finalizado exitosamente");
        setShowExecuteModal(false);
        setSelectedConteo(null);
        setConteoItems([]);
        stopCameraIfActive();
        fetchData();
      } else {
        toast.error(json.error || "Error al finalizar conteo");
      }
    } catch (err) {
      console.error("Error finalizing conteo:", err);
      toast.error("Error al finalizar conteo");
    } finally {
      setExecuting(false);
    }
  };

  const stopCameraIfActive = () => {
    if (barcodeScanner.isScanning) {
      barcodeScanner.stopCameraScan();
    }
    setShowCamera(false);
  };

  const handleViewDetail = async (conteo: ConteoData) => {
    setSelectedConteo(conteo);
    try {
      const res = await fetch(`/api/conteos?id=${conteo.id}`);
      const json = await res.json();
      if (json.success) {
        setDetailItems(json.data?.items || []);
        if (conteo.estado === "CERRADO") {
          setShowClosedViewModal(true);
        } else {
          setShowDetailModal(true);
        }
      }
    } catch (err) {
      console.error("Error loading detail:", err);
    }
    if (conteo.estado !== "CERRADO") setShowDetailModal(true);
  };

  const handleReconcile = async () => {
    if (!selectedConteo) return;
    setReconciling(true);
    try {
      const res = await fetch(`/api/conteos/${selectedConteo.id}/conciliar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aplicarAjustes: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Conteo conciliado exitosamente. Se crearon los ajustes.");
        setShowClosedViewModal(false);
        setShowReconcileModal(false);
        setSelectedConteo(null);
        fetchData();
      } else {
        toast.error(json.error || "Error al conciliar");
      }
    } catch (err) {
      console.error("Error reconciling:", err);
      toast.error("Error al conciliar");
    } finally {
      setReconciling(false);
    }
  };

  const exportToPDF = async (conteo: ConteoData) => {
    let items = detailItems;
    if (items.length === 0) {
      const res = await fetch(`/api/conteos?id=${conteo.id}`);
      const json = await res.json();
      items = json.success ? json.data?.items || [] : [];
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Reporte de Conteo Fisico", 14, 20);
    doc.setFontSize(10);
    doc.text(`ID: ${conteo.id}`, 14, 28);
    doc.text(`Bodega: ${conteo.bodega?.nombre || "N/A"}`, 14, 34);
    doc.text(`Estado: ${estadoLabel[conteo.estado]}`, 14, 40);
    doc.text(`Fecha: ${format(new Date(conteo.createdAt), "dd/MM/yyyy HH:mm")}`, 14, 46);

    const totalSistema = items.reduce((s, i) => s + i.cantidadSistema, 0);
    const totalFisico = items.reduce((s, i) => s + i.cantidadFisica, 0);
    const itemsConDif = items.filter(i => i.diferencia !== 0).length;
    const accuracy = items.length > 0 ? ((items.length - itemsConDif) / items.length) * 100 : 0;

    doc.text(`Total Sistema: ${totalSistema} | Total Fisico: ${totalFisico} | Precision: ${accuracy.toFixed(1)}%`, 14, 52);

    const tableRows = items.map((item) => [
      item.producto?.codigo || "N/A",
      item.producto?.nombre || "N/A",
      item.cantidadSistema.toString(),
      item.cantidadFisica.toString(),
      item.diferencia.toString(),
      item.diferencia !== 0 ? (item.diferencia > 0 ? "SOBRANTE" : "FALTANTE") : "OK",
    ]);

    (doc as any).autoTable({
      startY: 58,
      head: [["Codigo", "Producto", "Sistema", "Fisico", "Dif.", "Estado"]],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`conteo_${conteo.id.slice(0, 8)}.pdf`);
    toast.success("PDF exportado");
  };

  const stats = useMemo(() => {
    const totalConteos = conteos.length;
    const activos = conteos.filter((c) => c.estado === "ABIERTO" || c.estado === "EN_PROCESO" || c.estado === "PAUSADO").length;
    const conciliados = conteos.filter((c) => c.estado === "CONCILIADO").length;
    const totalItems = conteos.reduce((s, c) => s + (c.itemsCount || 0), 0);
    return { totalConteos, activos, conciliados, totalItems };
  }, [conteos]);

  const executeStats = useMemo(() => {
    const total = conteoItems.length;
    const withQuantity = conteoItems.filter(
      (item) => (physicalQuantities[item.id] ?? item.cantidadFisica) > 0
    ).length;
    const remaining = total - withQuantity;
    const diffs = conteoItems.filter(
      (item) => (physicalQuantities[item.id] ?? item.cantidadFisica) !== item.cantidadSistema
    ).length;
    const accuracy = total > 0 ? ((total - diffs) / total) * 100 : 0;
    return { total, scanned: withQuantity, remaining, diffs, accuracy };
  }, [conteoItems, physicalQuantities]);

  const currentItem = conteoItems[currentItemIndex];
  const currentFisica = currentItem ? (physicalQuantities[currentItem.id] ?? currentItem.cantidadFisica) : 0;
  const currentDiff = currentItem ? currentFisica - currentItem.cantidadSistema : 0;

  const startCamera = async () => {
    setShowCamera(true);
    await new Promise(r => setTimeout(r, 100));
    await barcodeScanner.startCameraScan();
  };

  const closeConteoModal = () => {
    stopCameraIfActive();
    setShowExecuteModal(false);
    setConteoItems([]);
    setSelectedConteo(null);
    fetchData();
  };

  useEffect(() => {
    return () => {
      stopCameraIfActive();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <ClipboardCheck className="h-7 w-7 text-indigo-400" />
              Conteos Fisicos
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Gestion de inventarios fisicos, conciliacion y ajustes
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-500 hover:bg-indigo-600">
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
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">Total Conteos</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.totalConteos}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-400">Activos</CardDescription>
            <CardTitle className="text-2xl text-amber-400">{stats.activos}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-400">Conciliados</CardDescription>
            <CardTitle className="text-2xl text-emerald-400">{stats.conciliados}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/50">Items Contados</CardDescription>
            <CardTitle className="text-2xl text-white">{stats.totalItems}</CardTitle>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg text-white">Historial de Conteos</CardTitle>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
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
                    <SelectItem value="PAUSADO">Pausado</SelectItem>
                    <SelectItem value="CERRADO">Cerrado</SelectItem>
                    <SelectItem value="CONCILIADO">Conciliado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterBodega} onValueChange={setFilterBodega}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Bodega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    {bodegas.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
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
                    <TableHead className="text-white/60">ID</TableHead>
                    <TableHead className="text-white/60">Bodega</TableHead>
                    <TableHead className="text-white/60">Estado</TableHead>
                    <TableHead className="text-center text-white/60">Items</TableHead>
                    <TableHead className="text-center text-white/60">Diferencias</TableHead>
                    <TableHead className="text-white/60">Inicio</TableHead>
                    <TableHead className="text-white/60">Usuario</TableHead>
                    <TableHead className="text-right text-white/60">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConteos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 text-center text-white/40">
                        No se encontraron conteos
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConteos.map((conteo) => (
                      <TableRow key={conteo.id} className="group border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                        <TableCell className="font-mono text-xs text-indigo-400">
                          {conteo.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-white/80">
                          <span className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-white/30" />
                            {conteo.bodega?.nombre || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={estadoBadgeVariant[conteo.estado]} className="text-[10px]">
                            {estadoLabel[conteo.estado]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-white/60">
                          {conteo.itemsCount || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {(conteo.diferencias || 0) > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">{conteo.diferencias}</Badge>
                          ) : (
                            <span className="text-xs text-emerald-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-white/50">
                          {format(new Date(conteo.fechaInicio || conteo.createdAt), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-xs text-white/60">
                          {conteo.usuario?.nombre || "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(conteo)} title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(conteo.estado === "ABIERTO" || conteo.estado === "EN_PROCESO" || conteo.estado === "PAUSADO") && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-400" onClick={() => handleStartConteo(conteo)} title="Ejecutar conteo">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {conteo.estado === "CERRADO" && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-400" onClick={() => { setSelectedConteo(conteo); handleViewDetail(conteo); }} title="Conciliar">
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportToPDF(conteo)} title="Exportar PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {conteo.estado === "CONCILIADO" && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => exportToPDF(conteo)} title="Exportar PDF">
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

      {/* Nuevo Conteo Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ClipboardList className="h-5 w-5 text-indigo-400" />
              Nuevo Conteo Fisico
            </DialogTitle>
            <DialogDescription>
              Configure los parametros para iniciar un nuevo conteo de inventario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateConteo)} className="space-y-4">
            <div>
              <Label className="text-white">Bodega *</Label>
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
                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {createForm.formState.errors.bodegaId && (
                <p className="mt-1 text-xs text-red-400">{createForm.formState.errors.bodegaId.message}</p>
              )}
            </div>

            <div>
              <Label className="text-white">Tipo de Conteo</Label>
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
                      <SelectItem value="PARCIAL">Parcial (seleccionar productos)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label className="text-white">Notas (opcional)</Label>
              <Controller
                name="notas"
                control={createForm.control}
                render={({ field }) => (
                  <Textarea placeholder="Notas del conteo..." className="min-h-[80px] resize-none" {...field} />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating} className="bg-indigo-500 hover:bg-indigo-600">
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Crear Conteo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Execute Conteo Modal - Split Screen */}
      <Dialog open={showExecuteModal} onOpenChange={(open) => { if (!open) closeConteoModal(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <ClipboardCheck className="h-5 w-5 text-indigo-400" />
                  Ejecutar Conteo
                </DialogTitle>
                <DialogDescription>
                  {selectedConteo?.bodega?.nombre}
                  {isPaused && <Badge variant="outline" className="ml-2 text-[10px] text-yellow-400">PAUSADO</Badge>}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isPaused ? (
                  <Button variant="outline" size="sm" onClick={handlePause} className="text-yellow-400">
                    <Pause className="mr-1 h-4 w-4" /> Pausar
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleResume} className="text-emerald-400">
                    <Play className="mr-1 h-4 w-4" /> Reanudar
                  </Button>
                )}
                <Button size="sm" onClick={handleFinalizar} disabled={executing} className="bg-indigo-500 hover:bg-indigo-600">
                  {executing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                  Finalizar
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/[0.02] p-3 md:grid-cols-5">
            <div className="text-center">
              <div className="text-xs text-white/50">Total items</div>
              <div className="text-lg font-bold text-white">{executeStats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50">Escaneados</div>
              <div className="text-lg font-bold text-emerald-400">{executeStats.scanned}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50">Restantes</div>
              <div className="text-lg font-bold text-amber-400">{executeStats.remaining}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50">Diferencias</div>
              <div className="text-lg font-bold text-red-400">{executeStats.diffs}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-white/50">Precision</div>
              <div className="text-lg font-bold text-indigo-400">{executeStats.accuracy.toFixed(1)}%</div>
            </div>
          </div>

          <Progress value={(executeStats.scanned / Math.max(executeStats.total, 1)) * 100} className="h-1.5" />

          {/* Barcode Scanner Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                ref={barcodeInputRef}
                placeholder={showCamera ? "Camara activa - escanee codigo..." : "Escanear codigo de barras o escriba el codigo..."}
                className="pl-10"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeScanned(manualBarcode);
                    setManualBarcode("");
                  }
                }}
                disabled={isPaused}
                autoFocus
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                handleBarcodeScanned(manualBarcode);
                setManualBarcode("");
              }}
            >
              Buscar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (barcodeScanner.isScanning) {
                  barcodeScanner.stopCameraScan();
                  setShowCamera(false);
                } else {
                  startCamera();
                }
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              {barcodeScanner.isScanning ? "Detener" : "Camara"}
            </Button>
          </div>

          {showCamera && (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <div
                id="barcode-scanner-camera"
                ref={scannerDivRef}
                className="w-full"
                style={{ minHeight: "200px" }}
              />
            </div>
          )}

          {barcodeScanner.error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {barcodeScanner.error}
            </div>
          )}

          <Separator className="bg-white/[0.04]" />

          {/* Split Screen: Left = Current Product, Right = Scanned List */}
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden md:grid-cols-2">
            {/* LEFT: Current Product */}
            <div className="overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.01] p-4">
              {currentItem && currentItem.producto ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Package className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{currentItem.producto.nombre}</h3>
                      <p className="text-sm text-white/50">{currentItem.producto.codigo}</p>
                      {currentItem.producto.codigoBarras && (
                        <p className="text-xs text-white/30">{currentItem.producto.codigoBarras}</p>
                      )}
                    </div>
                    <Badge className="ml-auto text-[10px]">
                      {currentItemIndex + 1} / {conteoItems.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/[0.02] p-3">
                      <div className="text-xs text-white/50">Cantidad Sistema</div>
                      <div className="text-2xl font-bold text-indigo-400">{currentItem.cantidadSistema}</div>
                    </div>
                    <div className="rounded-lg bg-white/[0.02] p-3">
                      <div className="text-xs text-white/50">Cantidad Fisica</div>
                      <Input
                        type="number"
                        min={0}
                        className="mt-1 text-lg font-bold"
                        value={currentFisica}
                        onChange={(e) =>
                          setPhysicalQuantities((prev) => ({
                            ...prev,
                            [currentItem.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={isPaused}
                      />
                    </div>
                  </div>

                  {currentDiff !== 0 && (
                    <div className={cn(
                      "rounded-lg p-3",
                      currentDiff > 0 ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      <div className="text-xs text-white/50">Diferencia</div>
                      <div className={cn(
                        "text-xl font-bold",
                        currentDiff > 0 ? "text-emerald-400" : "text-red-400"
                      )}>
                        {currentDiff > 0 ? "+" : ""}{currentDiff}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-white/50">Notas</Label>
                    <Input
                      className="mt-1"
                      placeholder="Nota opcional..."
                      value={itemNotes[currentItem.id] || ""}
                      onChange={(e) =>
                        setItemNotes((prev) => ({ ...prev, [currentItem.id]: e.target.value }))
                      }
                      disabled={isPaused}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCurrentItemIndex((i) => Math.max(0, i - 1))}
                      disabled={currentItemIndex === 0}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                    </Button>
                    <Button
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                      onClick={handleConfirmCurrent}
                      disabled={isPaused || executing}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" /> Confirmar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCurrentItemIndex((i) => Math.min(conteoItems.length - 1, i + 1))}
                      disabled={currentItemIndex >= conteoItems.length - 1}
                    >
                      Siguiente <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-white/30">
                  <Package className="mb-4 h-16 w-16" />
                  <p>Escanea un codigo de barras</p>
                  <p className="text-sm">o selecciona un producto de la lista</p>
                </div>
              )}
            </div>

            {/* RIGHT: Scanned List */}
            <div className="overflow-y-auto rounded-lg border border-white/[0.06] bg-white/[0.01]">
              <div className="sticky top-0 z-10 border-b border-white/[0.04] bg-[#0a0a2a]/90 px-4 py-2">
                <p className="text-xs font-medium text-white/60">Lista de Productos</p>
              </div>
              <div className="divide-y divide-white/[0.02]">
                {conteoItems.map((item, idx) => {
                  const fisica = physicalQuantities[item.id] ?? item.cantidadFisica;
                  const diff = fisica - item.cantidadSistema;
                  const isCurrent = idx === currentItemIndex;
                  return (
                    <button
                      key={item.id}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-white/[0.03]",
                        isCurrent && "bg-indigo-500/10 border-l-2 border-indigo-400"
                      )}
                      onClick={() => setCurrentItemIndex(idx)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-white/[0.02] text-xs font-mono text-white/40">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{item.producto?.nombre || "N/A"}</p>
                        <p className="text-xs text-white/40">{item.producto?.codigo || "N/A"}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-sm font-bold", diff !== 0 ? "text-red-400" : "text-emerald-400")}>
                          {fisica}
                        </p>
                        <p className="text-[10px] text-white/30">sis: {item.cantidadSistema}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Eye className="h-5 w-5 text-indigo-400" />
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
                  <TableHead className="text-white/60">Codigo</TableHead>
                  <TableHead className="text-white/60">Producto</TableHead>
                  <TableHead className="text-right text-white/60">Sistema</TableHead>
                  <TableHead className="text-right text-white/60">Fisico</TableHead>
                  <TableHead className="text-right text-white/60">Diferencia</TableHead>
                  <TableHead className="text-white/60">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailItems.map((item) => (
                  <TableRow key={item.id} className={cn("border-white/[0.02]", item.diferencia !== 0 && "bg-red-500/5")}>
                    <TableCell className="font-mono text-xs text-indigo-400">{item.producto?.codigo || "N/A"}</TableCell>
                    <TableCell className="text-white/80">{item.producto?.nombre || "N/A"}</TableCell>
                    <TableCell className="text-right text-white/60">{item.cantidadSistema}</TableCell>
                    <TableCell className="text-right text-white/60">{item.cantidadFisica}</TableCell>
                    <TableCell className="text-right">
                      {item.diferencia !== 0 ? (
                        <Badge variant={item.diferencia > 0 ? "success" : "destructive"} className="text-[10px]">
                          {item.diferencia > 0 ? "+" : ""}{item.diferencia}
                        </Badge>
                      ) : "0"}
                    </TableCell>
                    <TableCell className="text-xs text-white/40">{item.notas || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Closed Conteo View - shows summary + reconcile */}
      <Dialog open={showClosedViewModal} onOpenChange={setShowClosedViewModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ClipboardCheck className="h-5 w-5 text-indigo-400" />
              Conteo Cerrado - Resumen
            </DialogTitle>
            {selectedConteo && (
              <DialogDescription>
                {selectedConteo.bodega?.nombre} - Cerrado el{" "}
                {selectedConteo.fechaFin ? format(new Date(selectedConteo.fechaFin), "dd/MM/yyyy HH:mm") : "N/A"}
                {" - Usuario: "}{selectedConteo.usuario?.nombre || "N/A"}
              </DialogDescription>
            )}
          </DialogHeader>

          {(() => {
            const totalItems = detailItems.length;
            const totalSistema = detailItems.reduce((s, i) => s + i.cantidadSistema, 0);
            const totalFisico = detailItems.reduce((s, i) => s + i.cantidadFisica, 0);
            const itemsWithDiff = detailItems.filter(i => i.diferencia !== 0);
            const accuracy = totalItems > 0 ? ((totalItems - itemsWithDiff.length) / totalItems) * 100 : 0;

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Card className="bg-white/[0.02] p-3">
                    <div className="text-xs text-white/50">Total Items</div>
                    <div className="text-xl font-bold text-white">{totalItems}</div>
                  </Card>
                  <Card className="bg-white/[0.02] p-3">
                    <div className="text-xs text-white/50">Sistema Total</div>
                    <div className="text-xl font-bold text-white">{totalSistema}</div>
                  </Card>
                  <Card className="bg-white/[0.02] p-3">
                    <div className="text-xs text-white/50">Fisico Total</div>
                    <div className="text-xl font-bold text-white">{totalFisico}</div>
                  </Card>
                  <Card className="bg-white/[0.02] p-3">
                    <div className="text-xs text-amber-400">Diferencias</div>
                    <div className="text-xl font-bold text-amber-400">{itemsWithDiff.length}</div>
                  </Card>
                  <Card className="bg-white/[0.02] p-3">
                    <div className="text-xs text-emerald-400">Precision</div>
                    <div className="text-xl font-bold text-emerald-400">{accuracy.toFixed(1)}%</div>
                  </Card>
                </div>

                {itemsWithDiff.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-white">Items con diferencias</p>
                    <div className="max-h-60 overflow-auto rounded-lg border border-white/[0.06]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-white/60">Producto</TableHead>
                            <TableHead className="text-right text-white/60">Sistema</TableHead>
                            <TableHead className="text-right text-white/60">Fisico</TableHead>
                            <TableHead className="text-right text-white/60">Diferencia</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itemsWithDiff.map((item) => (
                            <TableRow key={item.id} className="border-white/[0.02] bg-red-500/5">
                              <TableCell className="text-white/80">
                                {item.producto?.codigo} - {item.producto?.nombre}
                              </TableCell>
                              <TableCell className="text-right text-white/60">{item.cantidadSistema}</TableCell>
                              <TableCell className="text-right text-white/60">{item.cantidadFisica}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={item.diferencia > 0 ? "success" : "destructive"} className="text-[10px]">
                                  {item.diferencia > 0 ? "+" : ""}{item.diferencia}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => exportToPDF(selectedConteo!)}>
                    <Download className="mr-2 h-4 w-4" /> Exportar PDF
                  </Button>
                  <Button
                    onClick={handleReconcile}
                    disabled={reconciling}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    {reconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Conciliar (Crear Ajustes)
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reconcile Modal */}
      <Dialog open={showReconcileModal} onOpenChange={setShowReconcileModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <RefreshCw className="h-5 w-5 text-amber-400" />
              Conciliar Conteo
            </DialogTitle>
            <DialogDescription>
              Se crearan movimientos de ajuste para las diferencias encontradas.
              Esta accion actualiza el inventario permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              Al conciliar se crearan movimientos de tipo CONTEO_DIFERENCIA para cada diferencia.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconcileModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReconcile} disabled={reconciling} className="bg-amber-500 hover:bg-amber-600 text-black">
              {reconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Aplicar Ajustes y Conciliar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
