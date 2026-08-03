"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Calendar,
  Warehouse,
  Trash2,
  Pencil,
  Eye,
  Send,
  Package,
  XCircle,
  CheckCircle,
  Loader2,
  Download,
  FileText,
  AlertTriangle,
  ArrowUpDown,
  Truck,
  Building2,
  DollarSign,
  Hash,
  ClipboardList,
} from "lucide-react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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

type OrdenEstado = "PENDIENTE" | "ENVIADA" | "RECIBIDA_PARCIAL" | "RECIBIDA" | "CANCELADA";

interface ProveedorOption {
  id: string;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  email: string | null;
}

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  costoUnit: number;
  unidadMedida: string;
}

interface OrdenLineItem {
  id: string;
  productoId: string;
  producto: ProductoOption;
  cantidad: number;
  costoUnit: number;
  total: number;
  recibido: number;
}

interface OrdenData {
  id: string;
  proveedorId: string;
  proveedor: ProveedorOption;
  estado: OrdenEstado;
  fecha: string;
  fechaEntrega: string | null;
  referencia: string | null;
  notas: string | null;
  subtotal: number;
  total: number;
  createdAt: string;
  items?: OrdenLineItem[];
  _count?: { items: number };
}

interface BodegaOption {
  id: string;
  nombre: string;
}

const ordenSchema = z.object({
  proveedorId: z.string().min(1, "Seleccione un proveedor"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  fechaEntrega: z.string().optional(),
  referencia: z.string().max(100).optional(),
  notas: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1, "Seleccione un producto"),
        cantidad: z.number().min(1, "Cantidad mínima: 1"),
        costoUnit: z.number().min(0, "El costo no puede ser negativo"),
        total: z.number().min(0),
      })
    )
    .min(1, "Agregue al menos un producto"),
});

type OrdenFormValues = z.infer<typeof ordenSchema>;

const estadoBadgeVariant: Record<OrdenEstado, "default" | "warning" | "success" | "destructive" | "outline"> = {
  PENDIENTE: "warning",
  ENVIADA: "default",
  RECIBIDA_PARCIAL: "outline",
  RECIBIDA: "success",
  CANCELADA: "destructive",
};

const estadoLabel: Record<OrdenEstado, string> = {
  PENDIENTE: "Pendiente",
  ENVIADA: "Enviada",
  RECIBIDA_PARCIAL: "Recibida Parcial",
  RECIBIDA: "Recibida",
  CANCELADA: "Cancelada",
};

export default function OrdenesCompraPage() {
  const [ordenes, setOrdenes] = useState<OrdenData[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [bodegas, setBodegas] = useState<BodegaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenData | null>(null);
  const [ordenItems, setOrdenItems] = useState<OrdenLineItem[]>([]);
  const [receptionQuantities, setReceptionQuantities] = useState<Record<string, number>>({});
  const [receptionBodegaId, setReceptionBodegaId] = useState("");

  const createForm = useForm<OrdenFormValues>({
    resolver: zodResolver(ordenSchema),
    defaultValues: {
      proveedorId: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      fechaEntrega: "",
      referencia: "",
      notas: "",
      items: [{ productoId: "", cantidad: 1, costoUnit: 0, total: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "items",
  });

  const watchItems = createForm.watch("items");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordRes, provRes, prodRes, bodRes] = await Promise.all([
        fetch("/api/ordenes-compra?limit=200"),
        fetch("/api/proveedores?limit=200"),
        fetch("/api/productos?limit=500&estado=ACTIVO"),
        fetch("/api/bodegas?activa=true&limit=100"),
      ]);

      const [oData, pData, prodData, bData] = await Promise.all([
        ordRes.json(),
        provRes.json(),
        prodRes.json(),
        bodRes.json(),
      ]);

      if (oData.success) setOrdenes(oData.data || []);
      if (pData.success) setProveedores(pData.data || []);
      if (prodData.success) setProductos(prodData.data || []);
      if (bData.success) setBodegas(bData.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrdenes = useMemo(() => {
    return ordenes.filter((o) => {
      if (filterEstado !== "ALL" && o.estado !== filterEstado) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (o.proveedor?.nombre || "").toLowerCase().includes(q) ||
          (o.referencia || "").toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [ordenes, filterEstado, searchQuery]);

  const stats = useMemo(() => {
    const pendientes = ordenes.filter((o) => o.estado === "PENDIENTE" || o.estado === "ENVIADA");
    const valorPendiente = pendientes.reduce((s, o) => s + (o.total || 0), 0);
    return {
      totalPendientes: pendientes.length,
      valorPendiente,
      total: ordenes.length,
    };
  }, [ordenes]);

  const lineTotal = useCallback((cantidad: number, costoUnit: number) => {
    return cantidad * costoUnit;
  }, []);

  const calculateTotal = useMemo(() => {
    if (!watchItems) return 0;
    return watchItems.reduce((sum, item) => sum + (item.cantidad * item.costoUnit), 0);
  }, [watchItems]);

  const handleCreateOrden = async (data: OrdenFormValues) => {
    setCreating(true);
    try {
      const payload = {
        proveedorId: data.proveedorId,
        fecha: data.fecha,
        fechaEntrega: data.fechaEntrega || null,
        referencia: data.referencia || null,
        notas: data.notas || null,
        items: data.items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          costoUnit: item.costoUnit,
        })),
      };

      const res = await fetch("/api/ordenes-compra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        createForm.reset({
          proveedorId: "",
          fecha: format(new Date(), "yyyy-MM-dd"),
          fechaEntrega: "",
          referencia: "",
          notas: "",
          items: [{ productoId: "", cantidad: 1, costoUnit: 0, total: 0 }],
        });
        fetchData();
      } else {
        console.error("Error:", json.error);
      }
    } catch (err) {
      console.error("Error creating orden:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkSent = async (orden: OrdenData) => {
    try {
      await fetch(`/api/ordenes-compra/${orden.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENVIADA" }),
      });
      fetchData();
    } catch (err) {
      console.error("Error updating:", err);
    }
  };

  const handleCancel = async (orden: OrdenData) => {
    try {
      await fetch(`/api/ordenes-compra/${orden.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADA" }),
      });
      fetchData();
    } catch (err) {
      console.error("Error cancelando:", err);
    }
  };

  const handleOpenReception = async (orden: OrdenData) => {
    setSelectedOrden(orden);
    setReceptionBodegaId(bodegas[0]?.id || "");
    try {
      const res = await fetch(`/api/ordenes-compra?id=${orden.id}`);
      const json = await res.json();
      if (json.success) {
        const items = json.data?.items || [];
        setOrdenItems(items);
        const qty: Record<string, number> = {};
        for (const item of items) {
          qty[item.id] = item.cantidad - (item.recibido || 0);
        }
        setReceptionQuantities(qty);
      }
    } catch (err) {
      console.error("Error loading items:", err);
    }
    setShowReceptionModal(true);
  };

  const handleReceive = async () => {
    if (!selectedOrden) return;
    try {
      const itemsToReceive = Object.entries(receptionQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ itemId, cantidad: qty }));

      await fetch(`/api/ordenes-compra/${selectedOrden.id}/recibir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bodegaId: receptionBodegaId,
          items: itemsToReceive,
        }),
      });

      setShowReceptionModal(false);
      setSelectedOrden(null);
      fetchData();
    } catch (err) {
      console.error("Error receiving:", err);
    }
  };

  const handleViewDetail = async (orden: OrdenData) => {
    setSelectedOrden(orden);
    try {
      const res = await fetch(`/api/ordenes-compra?id=${orden.id}`);
      const json = await res.json();
      if (json.success) {
        setOrdenItems(json.data?.items || []);
      }
    } catch (err) {
      console.error("Error loading detail:", err);
    }
    setShowDetailModal(true);
  };

  const exportToPDF = async (orden: OrdenData) => {
    const res = await fetch(`/api/ordenes-compra?id=${orden.id}`);
    const json = await res.json();
    const items: OrdenLineItem[] = json.success ? json.data?.items || [] : [];

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Orden de Compra", 14, 20);
    doc.setFontSize(10);
    doc.text(`Nro: ${orden.id.slice(0, 12)}`, 14, 28);
    doc.text(`Proveedor: ${orden.proveedor?.nombre || "N/A"}`, 14, 34);
    doc.text(`Estado: ${estadoLabel[orden.estado]}`, 14, 40);
    doc.text(`Fecha: ${format(new Date(orden.fecha), "dd/MM/yyyy")}`, 14, 46);
    if (orden.fechaEntrega) {
      doc.text(`Entrega: ${format(new Date(orden.fechaEntrega), "dd/MM/yyyy")}`, 14, 52);
    }

    const tableRows = items.map((item) => [
      item.producto?.codigo || "N/A",
      item.producto?.nombre || "N/A",
      item.cantidad.toString(),
      formatCurrency(item.costoUnit),
      formatCurrency(item.total),
      (item.recibido || 0).toString(),
    ]);

    (doc as any).autoTable({
      startY: orden.fechaEntrega ? 58 : 52,
      head: [["Código", "Producto", "Cant.", "Costo U.", "Total", "Recibido"]],
      body: tableRows,
      foot: [[
        "", "", "", "TOTAL:", formatCurrency(orden.total), "",
      ]],
      styles: { fontSize: 8, cellPadding: 1 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`orden_${orden.id.slice(0, 8)}.pdf`);
  };

  if (loading) {
    return (
      <div className="cosmic-bg min-h-screen">
        <div className="cosmic-grid" />
        <div className="relative z-10 space-y-6 p-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
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
                <ShoppingCart className="h-8 w-8 text-primary" />
                Órdenes de Compra
              </h1>
              <p className="mt-1 text-muted-foreground">
                Gestión de compras, recepción y seguimiento de órdenes
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="shimmer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Orden
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription>Total Órdenes</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-amber-400">Pendientes</CardDescription>
              <CardTitle className="text-2xl text-amber-400">{stats.totalPendientes}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary">Valor Pendiente</CardDescription>
              <CardTitle className="text-2xl text-primary">
                {formatCurrency(stats.valorPendiente)}
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
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-lg">Listado de Órdenes</CardTitle>
                <div className="flex gap-2">
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
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="ENVIADA">Enviada</SelectItem>
                      <SelectItem value="RECIBIDA_PARCIAL">Recibida Parcial</SelectItem>
                      <SelectItem value="RECIBIDA">Recibida</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
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
                      <TableHead>Orden #</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrdenes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                          No se encontraron órdenes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrdenes.map((orden) => (
                        <TableRow key={orden.id} className="group hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            {orden.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {orden.proveedor?.nombre || "N/A"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={estadoBadgeVariant[orden.estado]}>
                              {estadoLabel[orden.estado]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(orden.fecha), "dd/MM/yy")}
                          </TableCell>
                          <TableCell className="text-xs">
                            {orden.fechaEntrega
                              ? format(new Date(orden.fechaEntrega), "dd/MM/yy")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {orden._count?.items || 0}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(orden.total)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(orden)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {orden.estado === "PENDIENTE" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary"
                                  onClick={() => handleMarkSent(orden)}
                                  title="Marcar como enviada"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {(orden.estado === "ENVIADA" || orden.estado === "RECIBIDA_PARCIAL") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-400"
                                  onClick={() => handleOpenReception(orden)}
                                  title="Recibir items"
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              )}
                              {(orden.estado === "PENDIENTE") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleCancel(orden)}
                                  title="Cancelar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => exportToPDF(orden)}
                                title="Exportar PDF"
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Nueva Orden de Compra
            </DialogTitle>
            <DialogDescription>
              Complete los datos de la orden y agregue los productos
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreateOrden)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Proveedor</Label>
                <Controller
                  name="proveedorId"
                  control={createForm.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedores.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {createForm.formState.errors.proveedorId && (
                  <p className="mt-1 text-xs text-destructive">
                    {createForm.formState.errors.proveedorId.message}
                  </p>
                )}
              </div>
              <div>
                <Label>Referencia Interna</Label>
                <Controller
                  name="referencia"
                  control={createForm.control}
                  render={({ field }) => (
                    <Input placeholder="REF-001" {...field} />
                  )}
                />
              </div>
              <div>
                <Label>Fecha</Label>
                <Controller
                  name="fecha"
                  control={createForm.control}
                  render={({ field }) => <Input type="date" {...field} />}
                />
              </div>
              <div>
                <Label>Fecha de Entrega Estimada</Label>
                <Controller
                  name="fechaEntrega"
                  control={createForm.control}
                  render={({ field }) => <Input type="date" {...field} />}
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Controller
                name="notas"
                control={createForm.control}
                render={({ field }) => (
                  <Textarea
                    placeholder="Notas de la orden..."
                    className="min-h-[60px] resize-none"
                    {...field}
                  />
                )}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base">Productos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({ productoId: "", cantidad: 1, costoUnit: 0, total: 0 })
                  }
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar Línea
                </Button>
              </div>

              <div className="overflow-x-auto rounded-md border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Producto</TableHead>
                      <TableHead className="w-[100px] text-right">Cantidad</TableHead>
                      <TableHead className="w-[120px] text-right">Costo Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Controller
                            name={`items.${index}.productoId`}
                            control={createForm.control}
                            render={({ field: f }) => (
                              <Select value={f.value} onValueChange={(v) => {
                                f.onChange(v);
                                const prod = productos.find((p) => p.id === v);
                                if (prod) {
                                  createForm.setValue(`items.${index}.costoUnit`, prod.costoUnit);
                                  const cant = createForm.getValues(`items.${index}.cantidad`) || 0;
                                  createForm.setValue(`items.${index}.total`, cant * prod.costoUnit);
                                }
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Seleccionar producto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productos.slice(0, 200).map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.codigo} - {p.nombre}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.cantidad`}
                            control={createForm.control}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                min={1}
                                className="h-9 text-right"
                                value={f.value}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  f.onChange(val);
                                  const costo = createForm.getValues(`items.${index}.costoUnit`) || 0;
                                  createForm.setValue(`items.${index}.total`, val * costo);
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Controller
                            name={`items.${index}.costoUnit`}
                            control={createForm.control}
                            render={({ field: f }) => (
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                className="h-9 text-right"
                                value={f.value}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  f.onChange(val);
                                  const cant = createForm.getValues(`items.${index}.cantidad`) || 0;
                                  createForm.setValue(`items.${index}.total`, cant * val);
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCurrency(
                            (watchItems?.[index]?.cantidad || 0) *
                              (watchItems?.[index]?.costoUnit || 0)
                          )}
                        </TableCell>
                        <TableCell>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {createForm.formState.errors.items && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.items.message || "Verifique los productos"}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end">
              <div className="rounded-lg border border-white/10 bg-muted/30 px-6 py-2">
                <span className="text-sm text-muted-foreground">Total: </span>
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(calculateTotal)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Crear Orden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceptionModal} onOpenChange={setShowReceptionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-400" />
              Recibir Productos
            </DialogTitle>
            <DialogDescription>
              Ingrese las cantidades recibidas para cada producto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bodega de Destino</Label>
              <Select value={receptionBodegaId} onValueChange={setReceptionBodegaId}>
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
            </div>

            <div className="max-h-64 overflow-auto space-y-2">
              {ordenItems.map((item) => {
                const pendiente = item.cantidad - (item.recibido || 0);
                const currentReception = receptionQuantities[item.id] || 0;
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-md border border-white/5 bg-muted/20 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {item.producto?.nombre || "N/A"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Ordenado: {item.cantidad} | Recibido: {item.recibido || 0} | Pendiente: {pendiente}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={pendiente}
                        className="w-20 h-8 text-right"
                        value={currentReception}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setReceptionQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.min(val, pendiente),
                          }));
                        }}
                      />
                      <span className="text-xs text-muted-foreground w-16">
                        {item.producto?.codigo || ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceptionModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirmar Recepción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Detalle de Orden
            </DialogTitle>
          </DialogHeader>
          {selectedOrden && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Proveedor:</span>
                  <p className="font-medium">{selectedOrden.proveedor?.nombre}</p>
                </div>
                <div><span className="text-xs text-muted-foreground">Estado:</span>
                  <Badge variant={estadoBadgeVariant[selectedOrden.estado]} className="mt-0.5">
                    {estadoLabel[selectedOrden.estado]}
                  </Badge>
                </div>
                <div><span className="text-xs text-muted-foreground">Fecha:</span>
                  <p>{format(new Date(selectedOrden.fecha), "dd/MM/yyyy")}</p>
                </div>
                <div><span className="text-xs text-muted-foreground">Total:</span>
                  <p className="font-bold">{formatCurrency(selectedOrden.total)}</p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Costo U.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Recibido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.producto?.nombre || "N/A"}</TableCell>
                      <TableCell className="text-right">{item.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.costoUnit)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                      <TableCell className="text-right">{item.recibido || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
