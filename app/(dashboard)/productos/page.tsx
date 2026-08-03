"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatCurrency, generateBarcode, generateSKU, cn, calculateProfitMargin } from "@/lib/utils";
import {
  Search, Plus, Download, Upload, Pencil, Trash2, Copy, Eye, Printer,
  Barcode as BarcodeIcon, ChevronLeft, ChevronRight, ImageUp, FileText,
  FileSpreadsheet, AlertCircle, CheckCircle, X, Tag,
} from "lucide-react";

interface CategoriaOption { id: string; nombre: string; }
interface ProveedorOption { id: string; nombre: string; }

interface ProductoItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  categoriaId?: string;
  unidad: string;
  costoUnit: number;
  precioUnit: number;
  stockMin: number;
  stockMax: number;
  codigoBarras: string | null;
  sku: string | null;
  proveedor: string | null;
  proveedorId: string | null;
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
  categoriaId: string;
  unidad: string;
  costoUnit: number;
  precioUnit: number;
  stockMin: number;
  stockMax: number;
  codigoBarras: string;
  sku: string;
  proveedorId: string;
  imagen: string | null;
  estado: string;
  autoGenerarCodigo: boolean;
}

const emptyForm: ProductFormData = {
  nombre: "", descripcion: "", codigo: "", categoriaId: "",
  unidad: "UNIDAD", costoUnit: 0, precioUnit: 0, stockMin: 0, stockMax: 100,
  codigoBarras: "", sku: "", proveedorId: "", imagen: null, estado: "ACTIVO",
  autoGenerarCodigo: true,
};

interface ImportPreviewRow {
  rowNumber: number;
  codigo: string;
  nombre: string;
  categoria: string;
  precioUnit: string;
  costoUnit: string;
  unidadMedida: string;
  stockMin: string;
  stockMax: string;
  proveedor: string;
  codigoBarras: string;
  descripcion: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
  warnings: string[];
}

const CSV_TEMPLATE_HEADERS = [
  "Codigo", "Nombre", "Descripcion", "Categoria", "UnidadMedida",
  "CostoUnit", "PrecioUnit", "StockMin", "StockMax", "CodigoBarras", "SKU", "Proveedor"
];

const CSV_TEMPLATE_EXAMPLE_ROWS = [
  ["PRD-001", 'Tornillo 3/4"', "Tornillo de acero inoxidable 3/4 pulgada", "Ferreteria", "UNIDAD", "1.50", "3.00", "10", "200", "", "", "Distribuidora A"],
  ["PRD-002", "Martillo 16oz", "Martillo de carpintero mango de madera", "Ferreteria", "UNIDAD", "45.00", "89.90", "5", "50", "", "", "FerreMax"],
];

const COLUMN_DESCRIPTIONS: Record<string, string> = {
  codigo: "Codigo unico del producto. Si se deja vacio se genera automaticamente.",
  nombre: "Nombre del producto (obligatorio).",
  descripcion: "Descripcion detallada del producto.",
  categoria: "Categoria del producto. Si no existe se crea automaticamente.",
  unidadmedida: "Unidad de medida: UNIDAD, CAJA, METRO, KILO, LITRO, GALON, PAR, DOCENA.",
  costounit: "Costo unitario del producto en Q (numero decimal).",
  preciounit: "Precio de venta unitario en Q (numero decimal).",
  stockmin: "Cantidad minima de inventario antes de alerta.",
  stockmax: "Cantidad maxima de inventario.",
  codigobarras: "Codigo de barras EAN-13 del producto.",
  sku: "SKU o codigo de almacen.",
  proveedor: "Nombre del proveedor. Si no existe se crea automaticamente.",
};

export default function ProductosPage() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [categorias, setCategorias] = useState<CategoriaOption[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorOption[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("TODAS");
  const [filterStatus, setFilterStatus] = useState("TODOS");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductoItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormData>({ ...emptyForm });
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const perPage = 15;

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importPreviewHeaders, setImportPreviewHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, provRes] = await Promise.all([
        fetch("/api/productos?limit=200"),
        fetch("/api/categorias?limit=200"),
        fetch("/api/proveedores?limit=200"),
      ]);
      const [pData, cData, provData] = await Promise.all([
        pRes.json(), cRes.json(), provRes.json(),
      ]);
      if (pData.success) setProductos(pData.data || []);
      if (cData.success) setCategorias(cData.data || []);
      if (provData.success) setProveedores(provData.data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let result = [...productos];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.codigoBarras && p.codigoBarras.includes(q))
      );
    }
    if (filterCategory !== "TODAS") result = result.filter((p) => p.categoriaId === filterCategory || p.categoria === filterCategory);
    if (filterStatus !== "TODOS") result = result.filter((p) => p.estado === filterStatus);
    return result;
  }, [productos, search, filterCategory, filterStatus]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = useMemo(() =>
    filtered.slice((page - 1) * perPage, page * perPage),
    [filtered, page]
  );

  const validateForm = (f: ProductFormData): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.nombre || f.nombre.length < 2) errs.nombre = "Nombre debe tener al menos 2 caracteres";
    if (!f.codigo || f.codigo.length < 1) errs.codigo = "El codigo es obligatorio";
    if (!f.categoriaId && !showNewCategory) errs.categoriaId = "Seleccione una categoria";
    if (showNewCategory && !newCategoryInput.trim()) errs.categoriaId = "Ingrese el nombre de la nueva categoria";
    if (f.precioUnit < 0) errs.precioUnit = "El precio no puede ser negativo";
    if (f.costoUnit < 0) errs.costoUnit = "El costo no puede ser negativo";
    if (f.stockMin < 0) errs.stockMin = "No puede ser negativo";
    if (f.stockMax < f.stockMin) errs.stockMax = "Stock maximo debe ser mayor al minimo";
    return errs;
  };

  const openNew = () => {
    setEditingProduct(null);
    setShowNewCategory(false);
    setNewCategoryInput("");
    setValidationErrors({});
    setForm({
      ...emptyForm,
      codigo: `PRD-${String(Date.now()).slice(-8)}`,
      autoGenerarCodigo: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (product: ProductoItem) => {
    setEditingProduct(product);
    setShowNewCategory(false);
    setNewCategoryInput("");
    setValidationErrors({});
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion || "",
      codigo: product.codigo,
      categoriaId: product.categoriaId || "",
      unidad: product.unidad,
      costoUnit: product.costoUnit,
      precioUnit: product.precioUnit,
      stockMin: product.stockMin,
      stockMax: product.stockMax,
      codigoBarras: product.codigoBarras || "",
      sku: product.sku || "",
      proveedorId: product.proveedorId || "",
      imagen: product.imagen || null,
      estado: product.estado,
      autoGenerarCodigo: false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errs = validateForm(form);
    setValidationErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Corrija los errores del formulario");
      return;
    }

    setSaving(true);

    let resolvedCategoriaId = form.categoriaId;
    if (showNewCategory && newCategoryInput.trim()) {
      try {
        const catRes = await fetch("/api/categorias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: newCategoryInput.trim() }),
        });
        const catData = await catRes.json();
        if (catData.success) {
          resolvedCategoriaId = catData.data.id;
          setCategorias(prev => [...prev, catData.data]);
        } else {
          toast.error("Error al crear categoria: " + (catData.error || "Error desconocido"));
          setSaving(false);
          return;
        }
      } catch {
        toast.error("Error al crear categoria");
        setSaving(false);
        return;
      }
    }

    const payload = {
      codigo: form.codigo,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      categoriaId: resolvedCategoriaId,
      unidadMedida: form.unidad,
      costoUnit: form.costoUnit,
      precioUnit: form.precioUnit,
      stockMin: form.stockMin,
      stockMax: form.stockMax,
      codigoBarras: form.codigoBarras || null,
      sku: form.sku || null,
      proveedorId: form.proveedorId || null,
      imagen: form.imagen || null,
      estado: form.estado,
    };

    try {
      const url = editingProduct ? `/api/productos/${editingProduct.id}` : "/api/productos";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingProduct ? `Producto ${form.nombre} actualizado` : `Producto ${form.nombre} creado`);
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error(data.error || "Error al guardar producto");
      }
    } catch {
      toast.error("Error al guardar producto");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNew = async () => {
    await handleSave();
    if (!editingProduct) {
      openNew();
    }
  };

  const handleDuplicate = async (p: ProductoItem) => {
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: `PRD-${String(Date.now()).slice(-8)}`,
          nombre: `${p.nombre} (Copia)`,
          descripcion: p.descripcion,
          categoriaId: p.categoriaId || p.categoria,
          unidadMedida: p.unidad,
          costoUnit: p.costoUnit,
          precioUnit: p.precioUnit,
          stockMin: p.stockMin,
          stockMax: p.stockMax,
          codigoBarras: null,
          sku: null,
          proveedorId: p.proveedorId || null,
          imagen: p.imagen,
          estado: "ACTIVO",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Producto duplicado");
        fetchData();
      } else {
        toast.error(data.error || "Error al duplicar");
      }
    } catch {
      toast.error("Error al duplicar producto");
    }
  };

  const handleToggleStatus = async (p: ProductoItem) => {
    const newStatus = p.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    try {
      const res = await fetch(`/api/productos/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${p.nombre} ${newStatus === "ACTIVO" ? "activado" : "desactivado"}`);
        fetchData();
      }
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (p: ProductoItem) => {
    if (!confirm(`Eliminar "${p.nombre}"? Esta accion no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(`${p.nombre} eliminado`);
        fetchData();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar producto");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Codigo", "Nombre", "Descripcion", "Categoria", "Unidad", "Costo Unit.", "Precio Unit.", "Stock Min", "Stock Max", "Codigo Barras", "SKU", "Proveedor", "Estado"];
    const rows = filtered.map((p) => [
      p.codigo, p.nombre, p.descripcion || "", p.categoria, p.unidad,
      String(p.costoUnit), String(p.precioUnit), String(p.stockMin), String(p.stockMax),
      p.codigoBarras || "", p.sku || "", p.proveedor || "", p.estado,
    ]);
    let csv = "\uFEFF" + headers.map((h) => `"${h}"`).join(",") + "\n";
    csv += rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Exportacion completada");
  };

  const downloadTemplateCSV = () => {
    let csv = "\uFEFF" + CSV_TEMPLATE_HEADERS.map((h) => `"${h}"`).join(",") + "\n";
    csv += CSV_TEMPLATE_EXAMPLE_ROWS.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_productos_invenpro.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Plantilla CSV descargada");
  };

  const downloadTemplateXLSX = () => {
    let csv = "\uFEFF" + CSV_TEMPLATE_HEADERS.join("\t") + "\n";
    csv += CSV_TEMPLATE_EXAMPLE_ROWS.map((r) => r.join("\t")).join("\n");
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_productos_invenpro.xls";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Plantilla XLS descargada");
  };

  const detectDelimiter = (headerLine: string): string => {
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const tabCount = (headerLine.match(/\t/g) || []).length;
    if (semicolonCount > commaCount && semicolonCount > tabCount) return ";";
    if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
    return ",";
  };

  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else { current += char; }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text.trim()) { toast.error("El archivo esta vacio"); return; }
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 1) { toast.error("No se encontraron lineas"); return; }
      const delimiter = detectDelimiter(lines[0]);
      const headers = parseCSVLine(lines[0], delimiter).map((h) => h.replace(/^["']|["']$/g, "").toLowerCase().replace(/\s+/g, "_"));
      setImportPreviewHeaders(headers);
      const previewRows: ImportPreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i], delimiter);
        const record: Record<string, string> = {};
        headers.forEach((h, idx) => { record[h] = (values[idx] ?? "").replace(/^["']|["']$/g, ""); });
        previewRows.push({
          rowNumber: i + 1,
          codigo: record.codigo || record.código || "",
          nombre: record.nombre || record.producto || "",
          categoria: record.categoria || record.categoría || "",
          precioUnit: record.preciounit || record.precio || "0",
          costoUnit: record.costounit || record.costo || "0",
          unidadMedida: record.unidadmedida || record.unidad || "UNIDAD",
          stockMin: record.stockmin || record.stock_min || "0",
          stockMax: record.stockmax || record.stock_max || "0",
          proveedor: record.proveedor || "",
          codigoBarras: record.codigobarras || record.codigo_barras || "",
          descripcion: record.descripcion || record.descripción || "",
        });
      }
      setImportPreview(previewRows.slice(0, 200));
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/productos/import", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setImportResult({
          imported: data.data?.imported ?? 0,
          skipped: data.data?.skipped ?? 0,
          total: data.data?.total ?? 0,
          errors: data.data?.errors ?? [],
          warnings: data.data?.warnings ?? [],
        });
        toast.success(`Importacion completada: ${data.data?.imported ?? 0} productos`);
        fetchData();
      } else {
        toast.error(data.error || "Error en la importacion");
      }
    } catch {
      toast.error("Error al importar archivo");
    } finally {
      setImporting(false);
    }
  };

  const marginPercentage = useMemo(() => {
    if (form.precioUnit <= 0 || form.costoUnit <= 0) return 0;
    return calculateProfitMargin(form.costoUnit, form.precioUnit);
  }, [form.costoUnit, form.precioUnit]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Productos</h1>
          <p className="text-sm text-white/60">Catalogo de productos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-1 h-3.5 w-3.5" />Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-3.5 w-3.5" />Exportar
          </Button>
          <Button size="sm" onClick={openNew} className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="mr-1 h-4 w-4" />Nuevo Producto
          </Button>
        </div>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input placeholder="Buscar por nombre, codigo o barras..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODAS">Todas las categorias</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option value="DESCONTINUADO">Descontinuado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-white/50">
                  <th className="px-4 py-3 font-medium">Codigo</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 text-right font-medium">Costo</th>
                  <th className="px-4 py-3 text-right font-medium">Precio</th>
                  <th className="px-4 py-3 text-right font-medium">Stock Min</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-400">{p.codigo}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.nombre}</td>
                    <td className="px-4 py-3 text-white/60">{p.categoria}</td>
                    <td className="px-4 py-3 text-white/60">{p.unidad}</td>
                    <td className="px-4 py-3 text-right text-white/60">{formatCurrency(p.costoUnit)}</td>
                    <td className="px-4 py-3 text-right text-white/60">{formatCurrency(p.precioUnit)}</td>
                    <td className="px-4 py-3 text-right text-white/60">{p.stockMin}</td>
                    <td className="px-4 py-3">
                      <Badge variant={estadoVariant[p.estado] || "default"} className="text-[10px]">
                        {p.estado === "ACTIVO" ? "Activo" : p.estado === "INACTIVO" ? "Inactivo" : "Descontinuado"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(p)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleStatus(p)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={9} className="py-16 text-center text-white/40">No se encontraron productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40">
                Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-xs text-white/40">{page} / {totalPages}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {editingProduct ? (
                <><Pencil className="h-5 w-5 text-indigo-400" />Editar Producto</>
              ) : (
                <><Plus className="h-5 w-5 text-indigo-400" />Nuevo Producto</>
              )}
            </DialogTitle>
            <DialogDescription>Complete los datos del producto</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Codigo *</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value, autoGenerarCodigo: false })}
                  disabled={form.autoGenerarCodigo}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (form.autoGenerarCodigo) {
                      setForm({ ...form, autoGenerarCodigo: false });
                    } else {
                      setForm({ ...form, codigo: `PRD-${String(Date.now()).slice(-8)}`, autoGenerarCodigo: true });
                    }
                  }}
                  className={cn("text-xs", form.autoGenerarCodigo && "bg-indigo-500/10 text-indigo-400 border-indigo-500/20")}
                >
                  {form.autoGenerarCodigo ? "Auto" : "Auto"}
                </Button>
              </div>
              {validationErrors.codigo && <p className="text-xs text-red-400">{validationErrors.codigo}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              {validationErrors.nombre && <p className="text-xs text-red-400">{validationErrors.nombre}</p>}
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-white">Descripcion</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Categoria *</Label>
              {!showNewCategory ? (
                <select
                  value={form.categoriaId}
                  onChange={(e) => {
                    if (e.target.value === "__NEW__") {
                      setShowNewCategory(true);
                    } else {
                      setForm({ ...form, categoriaId: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                >
                  <option value="">Seleccionar categoria</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  <option value="__NEW__">+ Nueva categoria</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la categoria"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowNewCategory(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {validationErrors.categoriaId && <p className="text-xs text-red-400">{validationErrors.categoriaId}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Unidad de Medida</Label>
              <select
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
              >
                <option value="UNIDAD">UNIDAD</option>
                <option value="CAJA">CAJA</option>
                <option value="METRO">METRO</option>
                <option value="KILO">KILO</option>
                <option value="LITRO">LITRO</option>
                <option value="GALON">GALON</option>
                <option value="PAR">PAR</option>
                <option value="DOCENA">DOCENA</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Costo Unitario (Q)</Label>
              <Input type="number" step="0.01" min="0" value={form.costoUnit} onChange={(e) => setForm({ ...form, costoUnit: Number(e.target.value) || 0 })} />
              {validationErrors.costoUnit && <p className="text-xs text-red-400">{validationErrors.costoUnit}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Precio de Venta (Q)</Label>
              <Input type="number" step="0.01" min="0" value={form.precioUnit} onChange={(e) => setForm({ ...form, precioUnit: Number(e.target.value) || 0 })} />
              {validationErrors.precioUnit && <p className="text-xs text-red-400">{validationErrors.precioUnit}</p>}
              {form.costoUnit > 0 && form.precioUnit > 0 && (
                <p className={cn("text-xs", marginPercentage >= 30 ? "text-emerald-400" : marginPercentage >= 15 ? "text-amber-400" : "text-red-400")}>
                  Margen: {marginPercentage.toFixed(1)}%
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Stock Minimo</Label>
              <Input type="number" min="0" value={form.stockMin} onChange={(e) => setForm({ ...form, stockMin: Number(e.target.value) || 0 })} />
              {validationErrors.stockMin && <p className="text-xs text-red-400">{validationErrors.stockMin}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Stock Maximo</Label>
              <Input type="number" min="0" value={form.stockMax} onChange={(e) => setForm({ ...form, stockMax: Number(e.target.value) || 0 })} />
              {validationErrors.stockMax && <p className="text-xs text-red-400">{validationErrors.stockMax}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white">Codigo de Barras</Label>
              <div className="flex gap-1">
                <Input value={form.codigoBarras} onChange={(e) => setForm({ ...form, codigoBarras: e.target.value })} className="flex-1" />
                <Button variant="outline" size="icon" onClick={() => setForm({ ...form, codigoBarras: generateBarcode() })} className="h-10 w-10 shrink-0" title="Generar codigo de barras">
                  <BarcodeIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Proveedor</Label>
              <select
                value={form.proveedorId}
                onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}
                className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((prv) => <option key={prv.id} value={prv.id}>{prv.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Imagen URL</Label>
              <Input
                value={form.imagen || ""}
                onChange={(e) => setForm({ ...form, imagen: e.target.value || null })}
                placeholder="https://..."
              />
              {form.imagen && (
                <img
                  src={form.imagen}
                  alt="Preview"
                  className="mt-2 h-20 w-20 rounded-lg border border-white/10 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg bg-white/[0.02] p-3">
              <div>
                <Label className="text-white">Estado</Label>
                <p className="text-xs text-white/40">Producto activo o inactivo</p>
              </div>
              <Switch checked={form.estado === "ACTIVO"} onCheckedChange={(c) => setForm({ ...form, estado: c ? "ACTIVO" : "INACTIVO" })} />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            {!editingProduct && (
              <Button variant="outline" onClick={handleSaveAndNew} disabled={saving}>
                Guardar y Nuevo
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600">
              {saving ? <span className="animate-spin mr-2 h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> : null}
              {editingProduct ? "Guardar Cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Importar Productos desde CSV</DialogTitle>
            <DialogDescription>Seleccione un archivo CSV con los datos de productos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
                <FileText className="mr-1 h-3.5 w-3.5" />Plantilla CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplateXLSX}>
                <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />Plantilla Excel
              </Button>
            </div>

            <details className="rounded-lg border border-white/10 p-3">
              <summary className="text-sm font-medium text-white cursor-pointer">Descripcion de columnas</summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(COLUMN_DESCRIPTIONS).map(([col, desc]) => (
                  <p key={col} className="text-xs text-white/50">
                    <span className="font-mono text-indigo-400">{col}</span>: {desc}
                  </p>
                ))}
              </div>
            </details>

            <div className="space-y-2">
              <Label className="text-white">Archivo CSV</Label>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.tsv" onChange={handleFileSelected}
                className="w-full rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-indigo-500/20 file:px-3 file:py-1 file:text-xs file:text-indigo-300 file:font-medium"
              />
            </div>

            {importPreview.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white">Vista Previa ({importPreview.length} filas)</Label>
                <div className="max-h-60 overflow-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#0a0a2a] z-10">
                      <tr className="border-b border-white/[0.04] text-left text-white/50">
                        <th className="px-2 py-2">#</th><th className="px-2 py-2">Codigo</th><th className="px-2 py-2">Nombre</th>
                        <th className="px-2 py-2">Categoria</th><th className="px-2 py-2 text-right">Precio</th><th className="px-2 py-2 text-right">Costo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 100).map((row) => (
                        <tr key={row.rowNumber} className="border-b border-white/[0.02]">
                          <td className="px-2 py-1.5 text-white/40">{row.rowNumber}</td>
                          <td className="px-2 py-1.5 font-mono text-indigo-400">{row.codigo}</td>
                          <td className="px-2 py-1.5 text-white">{row.nombre}</td>
                          <td className="px-2 py-1.5 text-white/60">{row.categoria}</td>
                          <td className="px-2 py-1.5 text-right text-white/60">{row.precioUnit}</td>
                          <td className="px-2 py-1.5 text-right text-white/60">{row.costoUnit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult && (
              <div className="rounded-lg border border-white/10 p-4 space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-emerald-400" /><span className="text-sm text-white">{importResult.imported} importados</span></div>
                  {importResult.skipped > 0 && <div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-amber-400" /><span className="text-sm text-white">{importResult.skipped} errores</span></div>}
                  <span className="text-xs text-white/40">de {importResult.total} total</span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-32 overflow-auto rounded bg-red-500/10 p-2">
                    {importResult.errors.map((err, i) => <p key={i} className="text-xs text-red-400">{err}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); fetchData(); }}>Cerrar</Button>
            <Button onClick={handleImport} disabled={!importFile || importing} className="bg-indigo-500 hover:bg-indigo-600">
              {importing ? <span className="animate-spin mr-1">&#9696;</span> : <Upload className="mr-1 h-3.5 w-3.5" />}
              {importing ? "Importando..." : "Confirmar Importacion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
