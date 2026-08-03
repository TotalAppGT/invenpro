"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatCurrency, generateBarcode, generateSKU, cn } from "@/lib/utils";
import {
  Search, Plus, Download, FileText, Upload, Pencil, Trash2, Copy, Eye, Printer, Barcode as BarcodeIcon,
  ChevronLeft, ChevronRight, ImageUp, X,
} from "lucide-react";

interface ProductoItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  unidad: string;
  costoUnit: number;
  precioUnit: number;
  stockMin: number;
  stockMax: number;
  codigoBarras: string | null;
  sku: string | null;
  proveedor: string | null;
  imagen: string | null;
  estado: string;
}

const estadoVariant: Record<string, "success" | "default" | "destructive"> = {
  ACTIVO: "success", INACTIVO: "default", DESCONTINUADO: "destructive",
};

interface ProductFormData {
  nombre: string;
  descripcion: string;
  codigo: string;
  categoria: string;
  unidad: string;
  costoUnit: number;
  precioUnit: number;
  stockMin: number;
  stockMax: number;
  codigoBarras: string;
  sku: string;
  proveedor: string;
  estado: string;
}

export default function ProductosPage() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("TODAS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoItem | null>(null);
  const [form, setForm] = useState<ProductFormData>({
    nombre: "", descripcion: "", codigo: "", categoria: "Ferretería", unidad: "UNIDAD",
    costoUnit: 0, precioUnit: 0, stockMin: 0, stockMax: 100, codigoBarras: "", sku: "", proveedor: "", estado: "ACTIVO",
  });
  const perPage = 15;

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    const categorias = ["Ferretería", "Electrónicos", "Construcción", "Papelería", "Pintura", "Plomería"];
    const proveedores = ["Distribuidora A", "Importadora B", "FerreMax", "Proveedor C", null];
    const nombres = ["Tornillo 3/4\"", "Cemento Portland", "Laptop HP ProBook", "Papel Bond A4", "Martillo 16oz", "Pintura Blanca Galón", "Mouse Inalámbrico", "Destornillador Philips", "Cable HDMI 2m", "Clavos 2\"", "Taladro Bosch", "Sierra Circular"];
    const mock: ProductoItem[] = Array.from({ length: 52 }, (_, i) => ({
      id: `prod-${i + 1}`,
      codigo: `PRD-${String(i + 1).padStart(4, "0")}`,
      nombre: nombres[i % nombres.length],
      descripcion: i % 3 === 0 ? `Descripción del producto ${i + 1}` : null,
      categoria: categorias[i % categorias.length],
      unidad: ["UNIDAD", "CAJA", "METRO", "KILO", "LITRO", "GALON"][i % 6],
      costoUnit: Math.round((Math.random() * 500 + 10) * 100) / 100,
      precioUnit: Math.round((Math.random() * 800 + 20) * 100) / 100,
      stockMin: Math.floor(Math.random() * 20) + 1,
      stockMax: Math.floor(Math.random() * 200) + 50,
      codigoBarras: i % 4 === 0 ? generateBarcode() : null,
      sku: i % 5 === 0 ? generateSKU({ categoryPrefix: categorias[i % categorias.length].slice(0, 3), id: i + 1 }) : null,
      proveedor: proveedores[i % proveedores.length],
      imagen: null,
      estado: ["ACTIVO", "ACTIVO", "ACTIVO", "INACTIVO", "DESCONTINUADO"][i % 5],
    }));
    setProductos(mock);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))].sort(), [productos]);

  const filtered = useMemo(() => {
    let result = [...productos];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || (p.codigoBarras && p.codigoBarras.includes(q)));
    }
    if (filterCategory !== "TODAS") result = result.filter((p) => p.categoria === filterCategory);
    if (filterStatus !== "TODOS") result = result.filter((p) => p.estado === filterStatus);
    return result;
  }, [productos, search, filterCategory, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openNew = () => {
    setEditingProduct(null);
    setForm({
      nombre: "", descripcion: "", codigo: `PRD-${String(productos.length + 1).padStart(4, "0")}`, categoria: categorias[0] || "General",
      unidad: "UNIDAD", costoUnit: 0, precioUnit: 0, stockMin: 0, stockMax: 100, codigoBarras: "", sku: "", proveedor: "", estado: "ACTIVO",
    });
    setDialogOpen(true);
  };

  const openEdit = (product: ProductoItem) => {
    setEditingProduct(product);
    setForm({
      nombre: product.nombre, descripcion: product.descripcion || "", codigo: product.codigo, categoria: product.categoria,
      unidad: product.unidad, costoUnit: product.costoUnit, precioUnit: product.precioUnit,
      stockMin: product.stockMin, stockMax: product.stockMax, codigoBarras: product.codigoBarras || "",
      sku: product.sku || "", proveedor: product.proveedor || "", estado: product.estado,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre || !form.codigo) { toast.error("Nombre y código son obligatorios"); return; }
    if (editingProduct) {
      setProductos((prev) => prev.map((p) => p.id === editingProduct.id ? { ...p, ...form } : p));
      toast.success(`Producto ${form.nombre} actualizado`);
    } else {
      const newProduct: ProductoItem = { id: `prod-${Date.now()}`, ...form, descripcion: form.descripcion || null, codigoBarras: form.codigoBarras || null, sku: form.sku || null, proveedor: form.proveedor || null, imagen: null };
      setProductos((prev) => [...prev, newProduct]);
      toast.success(`Producto ${form.nombre} creado`);
    }
    setDialogOpen(false);
  };

  const handleDuplicate = (p: ProductoItem) => {
    const duplicated: ProductoItem = { ...p, id: `prod-${Date.now()}`, codigo: `PRD-${String(productos.length + 1).padStart(4, "0")}`, nombre: `${p.nombre} (Copia)` };
    setProductos((prev) => [...prev, duplicated]);
    toast.success("Producto duplicado");
  };

  const handleToggleStatus = (p: ProductoItem) => {
    const newStatus = p.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    setProductos((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, estado: newStatus } : pr));
    toast.success(`${p.nombre} ${newStatus === "ACTIVO" ? "activado" : "desactivado"}`);
  };

  const handleDelete = (p: ProductoItem) => {
    setProductos((prev) => prev.filter((pr) => pr.id !== p.id));
    toast.success(`${p.nombre} eliminado`);
  };

  const handleExportExcel = () => toast.success("Exportando a Excel...");
  const handleImportCSV = () => toast.success("Abrir importación CSV...");

  if (loading) {
    return (<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImportCSV}><Upload className="mr-1 h-3.5 w-3.5" />Importar CSV</Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="mr-1 h-3.5 w-3.5" />Exportar</Button>
          <Button size="sm" onClick={openNew}><Plus className="mr-1 h-4 w-4" />Nuevo Producto</Button>
        </div>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, código o barras..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="DESCONTINUADO">Descontinuado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Categoría</th>
                  <th className="pb-3 pr-4 font-medium">Unidad</th>
                  <th className="pb-3 pr-4 font-medium text-right">Costo</th>
                  <th className="pb-3 pr-4 font-medium text-right">Precio</th>
                  <th className="pb-3 pr-4 font-medium text-right">Stock Mín</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-400">{p.codigo}</td>
                    <td className="py-3 pr-4 font-medium text-white">{p.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.categoria}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.unidad}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(p.costoUnit)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(p.precioUnit)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{p.stockMin}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant[p.estado] || "default"} className="text-[10px]">{p.estado === "ACTIVO" ? "Activo" : p.estado === "INACTIVO" ? "Inactivo" : "Descontinuado"}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(p)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(p)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info("Ver Kardex")}><Printer className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No se encontraron productos</td></tr>)}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editingProduct ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>Complete los datos del producto</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Categoría</Label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="NUEVA">+ Agregar nueva</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Unidad de Medida</Label>
              <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                <option value="UNIDAD">UNIDAD</option>
                <option value="CAJA">CAJA</option>
                <option value="METRO">METRO</option>
                <option value="KILO">KILO</option>
                <option value="LITRO">LITRO</option>
                <option value="GALON">GALÓN</option>
                <option value="PAR">PAR</option>
                <option value="DOCENA">DOCENA</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Costo Unitario (Q)</Label>
              <Input type="number" step="0.01" min="0" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Precio de Venta (Q)</Label>
              <Input type="number" step="0.01" min="0" value={form.precioUnit} onChange={(e) => setForm({ ...form, precioUnit: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Stock Mínimo</Label>
              <Input type="number" min="0" value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Stock Máximo</Label>
              <Input type="number" min="0" value={form.stockMax} onChange={(e) => setForm({ ...form, stockMax: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Código de Barras</Label>
              <div className="flex gap-1">
                <Input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} className="flex-1" />
                <Button variant="outline" size="icon" onClick={() => setForm({ ...form, codigoBarras: generateBarcode() })} className="h-10 w-10"><BarcodeIcon className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Proveedor</Label>
              <Input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} placeholder="Nombre del proveedor" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Imagen</Label>
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 p-3">
                <ImageUp className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click para subir (opcional)</span>
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <div>
                <Label className="text-white">Estado</Label>
                <p className="text-xs text-muted-foreground">Producto activo o inactivo</p>
              </div>
              <Switch checked={form.estado === "ACTIVO"} onCheckedChange={(c) => setForm({ ...form, estado: c ? "ACTIVO" : "INACTIVO" })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingProduct ? "Guardar Cambios" : "Crear Producto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
