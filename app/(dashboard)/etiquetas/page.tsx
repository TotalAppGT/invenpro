"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tags, Printer, FileText, Download, Plus, Search, X, Package, Barcode,
  Loader2, ScanLine, Settings, Grid3X3, Layers,
} from "lucide-react";
import jsPDF from "jspdf";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import BarcodeGenerator, { barcodeToCanvasDataURL } from "@/components/barcode-generator";
import { formatCurrency, cn } from "@/lib/utils";

interface ProductoOption {
  id: string;
  nombre: string;
  codigo: string;
  codigoBarras: string | null;
  precioUnit: number;
  costoUnit: number;
}

interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  label: string;
}

interface SelectedProduct extends ProductoOption {
  quantity: number;
  showPrice: boolean;
  customText: string;
}

const LABEL_TEMPLATES: LabelTemplate[] = [
  { id: "small", name: "Pequeña", width: 50, height: 25, columns: 4, rows: 10, label: "50x25mm" },
  { id: "medium", name: "Mediana", width: 70, height: 35, columns: 3, rows: 8, label: "70x35mm" },
  { id: "large", name: "Grande", width: 100, height: 50, columns: 2, rows: 5, label: "100x50mm" },
];

const COMPANY_NAME = "InvenPro";

export default function EtiquetasPage() {
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [productoSearch, setProductoSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(LABEL_TEMPLATES[1]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [copiesPerProduct, setCopiesPerProduct] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(true);
  const [customGlobalText, setCustomGlobalText] = useState("");
  const [activeTab, setActiveTab] = useState("single");
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());

  const previewRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/productos?limit=500&estado=ACTIVO");
      const data = await res.json();
      if (data.success) setProductos(data.data || []);
    } catch (err) {
      console.error("Error loading productos:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const addProduct = (producto: ProductoOption) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === producto.id);
      if (exists) {
        return prev.map((p) =>
          p.id === producto.id ? { ...p, quantity: p.quantity + copiesPerProduct } : p
        );
      }
      return [
        ...prev,
        { ...producto, quantity: copiesPerProduct, showPrice: showPriceOnLabel, customText: "" },
      ];
    });
    setProductoSearch("");
    setShowDropdown(false);
  };

  const removeProduct = (productoId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productoId));
  };

  const handleScanBarcode = () => {
    if (!barcodeInput.trim()) return;
    const found = productos.find(
      (p) => p.codigoBarras === barcodeInput.trim() || p.codigo === barcodeInput.trim()
    );
    if (found) addProduct(found);
    setBarcodeInput("");
  };

  const generateLabelBarcodeCanvas = async (
    value: string,
    w: number,
    h: number
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const dataUrl = barcodeToCanvasDataURL(value, "CODE128", w * 2, h * 2, false);
        resolve(dataUrl || null);
      } catch {
        resolve(null);
      }
    });
  };

  const generatePDF = async () => {
    if (selectedProducts.length === 0) return;
    setGenerating(true);

    try {
      const template = selectedTemplate;
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 8;
      const marginY = 8;
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;
      const labelW = template.width;
      const labelH = template.height;
      const gapX = 2;
      const gapY = 2;
      const cols = Math.floor((usableWidth + gapX) / (labelW + gapX));
      const rows = Math.floor((usableHeight + gapY) / (labelH + gapY));
      const perPage = cols * rows;

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const allLabels: { producto: SelectedProduct; barcodeValue: string }[] = [];
      for (const sp of selectedProducts) {
        const bv = sp.codigoBarras || sp.codigo;
        for (let i = 0; i < sp.quantity; i++) {
          allLabels.push({ producto: sp, barcodeValue: bv });
        }
      }

      for (let idx = 0; idx < allLabels.length; idx++) {
        const pageIdx = Math.floor(idx / perPage);
        const labelIdx = idx % perPage;
        const col = labelIdx % cols;
        const row = Math.floor(labelIdx / cols);

        if (idx > 0 && labelIdx === 0) {
          doc.addPage();
        }

        const x = marginX + col * (labelW + gapX);
        const y = marginY + row * (labelH + gapY);
        const { producto, barcodeValue } = allLabels[idx];

        doc.setDrawColor(180);
        doc.setLineWidth(0.15);
        doc.roundedRect(x, y, labelW, labelH, 0.8, 0.8, "S");

        doc.setFontSize(5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 60);
        doc.text(COMPANY_NAME, x + labelW / 2, y + 3.5, { align: "center", maxWidth: labelW - 2 });

        doc.setFontSize(4.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 80);
        const nameText = producto.nombre.length > 20 ? producto.nombre.substring(0, 19) + ".." : producto.nombre;
        doc.text(nameText, x + labelW / 2, y + 6.5, { align: "center", maxWidth: labelW - 2 });

        const barcodeWidth = Math.min(labelW * 0.75, 35);
        const barcodeHeight = 7;
        const barcodeX = x + labelW / 2 - barcodeWidth / 2;
        const barcodeY = y + 8;

        doc.setFillColor(255, 255, 255);
        doc.rect(barcodeX, barcodeY, barcodeWidth, barcodeHeight, "F");

        doc.setFontSize(4);
        doc.setFont("helvetica", "normal");
        const barcodeBars = generateCode128BarsToPDF(barcodeValue, barcodeWidth, barcodeHeight);
        doc.setTextColor(0, 0, 0);
        for (const bar of barcodeBars) {
          doc.setFillColor(0, 0, 0);
          doc.rect(barcodeX + bar.x, barcodeY, bar.w, barcodeHeight, "F");
        }

        doc.setFontSize(3.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.text(barcodeValue, x + labelW / 2, barcodeY + barcodeHeight + 2.2, { align: "center", maxWidth: labelW - 2 });

        if (producto.precioUnit > 0) {
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(20, 20, 40);
          doc.text(formatCurrency(producto.precioUnit), x + labelW / 2, y + labelH - 2.5, { align: "center" });
        }

        const extraText = producto.customText || customGlobalText;
        if (extraText) {
          doc.setFontSize(3.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(120, 120, 140);
          doc.text(extraText, x + labelW / 2, y + labelH - 5, { align: "center", maxWidth: labelW - 2 });
        }
      }

      doc.save(`etiquetas_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const template = selectedTemplate;
    const allLabels: { producto: SelectedProduct; barcodeValue: string }[] = [];
    for (const sp of selectedProducts) {
      const bv = sp.codigoBarras || sp.codigo;
      for (let i = 0; i < sp.quantity; i++) {
        allLabels.push({ producto: sp, barcodeValue: bv });
      }
    }

    const labelHTML = allLabels
      .map(({ producto, barcodeValue }) => {
        const encode = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const bars = generateCode128BarsToPDF(barcodeValue, template.width * 0.75, 7);
        let barsSvg = "";
        for (const bar of bars) {
          barsSvg += `<rect x="${bar.x}" y="0" width="${bar.w}" height="7" fill="#000"/>`;
        }

        return `
          <div style="width:${template.width}mm;height:${template.height}mm;border:0.15mm solid #ccc;border-radius:0.8mm;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;padding:1mm;box-sizing:border-box;page-break-inside:avoid;">
            <div style="font-size:4pt;font-weight:bold;color:#28283c;">${encode(COMPANY_NAME)}</div>
            <div style="font-size:3.5pt;color:#3c3c50;margin-top:0.3mm;text-align:center;max-width:${template.width - 2}mm;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${encode(producto.nombre)}</div>
            <div style="margin-top:0.5mm;">
              <svg xmlns="http://www.w3.org/2000/svg" width="${template.width * 0.75}mm" height="7mm" viewBox="0 0 ${template.width * 0.75} 7">
                ${barsSvg}
              </svg>
            </div>
            <div style="font-size:2.5pt;color:#505050;margin-top:0.2mm;">${encode(barcodeValue)}</div>
            ${producto.precioUnit > 0 ? `<div style="font-size:4pt;font-weight:bold;color:#141428;margin-top:0.3mm;">${formatCurrency(producto.precioUnit)}</div>` : ""}
          </div>`;
      })
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiquetas - InvenPro</title>
        <style>
          @page { size: A4; margin: 8mm; }
          body { margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${labelHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const addBatchProducts = () => {
    const toAdd = productos.filter((p) => selectedBatch.has(p.id));
    for (const prod of toAdd) {
      setSelectedProducts((prev) => {
        const exists = prev.find((p) => p.id === prod.id);
        if (exists) {
          return prev.map((p) =>
            p.id === prod.id ? { ...p, quantity: p.quantity + copiesPerProduct } : p
          );
        }
        return [...prev, { ...prod, quantity: copiesPerProduct, showPrice: showPriceOnLabel, customText: "" }];
      });
    }
    setSelectedBatch(new Set());
    setBatchSelectMode(false);
  };

  if (loading) {
    return (
      <div className="cosmic-bg min-h-screen">
        <div className="cosmic-grid" />
        <div className="relative z-10 space-y-6 p-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-[500px] lg:col-span-1" />
            <Skeleton className="h-[500px] lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cosmic-bg min-h-screen">
      <div className="cosmic-grid" />
      <div className="relative z-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Tags className="h-8 w-8 text-primary" />
                Generador de Etiquetas
              </h1>
              <p className="mt-1 text-muted-foreground">Códigos de barras profesionales para tus productos</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-1 space-y-4"
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Plantilla</Label>
                  <Select
                    value={selectedTemplate.id}
                    onValueChange={(v) => {
                      const t = LABEL_TEMPLATES.find((lt) => lt.id === v);
                      if (t) setSelectedTemplate(t);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LABEL_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.label})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Copias por producto</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={copiesPerProduct}
                    onChange={(e) => setCopiesPerProduct(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="showPrice" checked={showPriceOnLabel} onCheckedChange={(v) => setShowPriceOnLabel(!!v)} />
                  <Label htmlFor="showPrice" className="cursor-pointer">Mostrar precio</Label>
                </div>
                <div>
                  <Label>Texto extra (todas las etiquetas)</Label>
                  <Input
                    placeholder="Ej: Sucursal Central"
                    value={customGlobalText}
                    onChange={(e) => setCustomGlobalText(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-primary" />Escanear / Buscar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full">
                    <TabsTrigger value="single" className="flex-1">Individual</TabsTrigger>
                    <TabsTrigger value="batch" className="flex-1">Múltiple</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="space-y-3 pt-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Código de barras..."
                          className="pl-10"
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScanBarcode(); } }}
                        />
                      </div>
                      <Button variant="outline" onClick={handleScanBarcode}><Search className="h-4 w-4" /></Button>
                    </div>

                    <div ref={searchRef} className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar producto..."
                          className="pl-10"
                          value={productoSearch}
                          onChange={(e) => { setProductoSearch(e.target.value); setShowDropdown(true); }}
                          onFocus={() => setShowDropdown(true)}
                        />
                      </div>
                      <AnimatePresence>
                        {showDropdown && filteredProductos.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute z-50 mt-1 w-full rounded-md border border-white/10 bg-popover shadow-lg backdrop-blur-md max-h-60 overflow-auto p-1"
                          >
                            {filteredProductos.slice(0, 50).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                                onClick={() => addProduct(p)}
                              >
                                <Package className="h-4 w-4 text-primary flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium">{p.nombre}</div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{p.codigo}</span>
                                    {p.precioUnit > 0 && <span>{formatCurrency(p.precioUnit)}</span>}
                                  </div>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </TabsContent>

                  <TabsContent value="batch" className="space-y-3 pt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={batchSelectMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => { setBatchSelectMode(!batchSelectMode); setSelectedBatch(new Set()); }}
                      >
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        {batchSelectMode ? "Cancelar" : "Seleccionar Múltiple"}
                      </Button>
                      {batchSelectMode && selectedBatch.size > 0 && (
                        <Button size="sm" onClick={addBatchProducts}>
                          <Layers className="mr-2 h-4 w-4" />
                          Agregar {selectedBatch.size} productos
                        </Button>
                      )}
                    </div>
                    {batchSelectMode && (
                      <div className="max-h-64 overflow-auto rounded-md border border-white/10 p-2">
                        {productos.slice(0, 100).map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                            onClick={() => {
                              setSelectedBatch((prev) => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                              });
                            }}
                          >
                            <Checkbox checked={selectedBatch.has(p.id)} className="pointer-events-none" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm">{p.nombre}</div>
                              <div className="text-xs text-muted-foreground">{p.codigo}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tags className="h-5 w-5 text-primary" />
                  Productos Seleccionados ({selectedProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-64 overflow-auto">
                {selectedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Agregue productos para generar etiquetas</p>
                ) : (
                  selectedProducts.map((sp) => (
                    <div key={sp.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-muted/20 p-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{sp.nombre}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{sp.codigo}</span><span>x{sp.quantity}</span>
                        </div>
                      </div>
                      <Input
                        type="number" min={0} className="w-16 h-8 text-xs"
                        value={sp.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSelectedProducts((prev) =>
                            prev.map((p) => (p.id === sp.id ? { ...p, quantity: val } : p))
                          );
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(sp.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button onClick={generatePDF} disabled={selectedProducts.length === 0 || generating} className="flex-1">
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generar PDF
                </Button>
                <Button variant="outline" onClick={handlePrint} disabled={selectedProducts.length === 0}>
                  <Printer className="mr-2 h-4 w-4" />Imprimir
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-primary" />Vista Previa
                </CardTitle>
                <CardDescription>
                  {selectedTemplate.name} ({selectedTemplate.label}) - {selectedTemplate.columns}x{selectedTemplate.rows} por página
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div ref={previewRef} className="space-y-6">
                  {selectedProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Barcode className="h-16 w-16 opacity-20" />
                      <p className="mt-4">Seleccione productos para previsualizar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {selectedProducts.slice(0, 9).map((sp) => {
                        const barcodeVal = sp.codigoBarras || sp.codigo;
                        const canvasW = selectedTemplate.width * 2.5;
                        const canvasH = selectedTemplate.height * 2.5;
                        return (
                          <div key={sp.id} className="flex flex-col items-center rounded-lg border border-white/10 bg-white p-3">
                            <div
                              className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50"
                              style={{ width: canvasW, height: canvasH }}
                            >
                              <span className="text-[8px] font-bold text-gray-700">{COMPANY_NAME}</span>
                              <span className="text-[7px] text-gray-600 truncate max-w-full px-1 text-center">{sp.nombre}</span>
                              <div className="my-0.5" style={{ width: canvasW * 0.85, height: canvasH * 0.35 }}>
                                <BarcodeGenerator
                                  value={barcodeVal}
                                  width={canvasW * 0.85}
                                  height={canvasH * 0.35}
                                  format="CODE128"
                                  displayValue={false}
                                />
                              </div>
                              <span className="text-[6px] text-gray-500">{barcodeVal}</span>
                              {showPriceOnLabel && sp.precioUnit > 0 && (
                                <span className="text-[8px] font-bold text-gray-900 mt-0.5">{formatCurrency(sp.precioUnit)}</span>
                              )}
                              {(sp.customText || customGlobalText) && (
                                <span className="text-[5px] text-gray-400">{sp.customText || customGlobalText}</span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2 w-full">
                              <span className="text-xs text-foreground truncate flex-1">{sp.nombre}</span>
                              <Badge variant="outline" className="text-[10px]">x{sp.quantity}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function generateCode128BarsToPDF(
  value: string,
  width: number,
  height: number
): { x: number; w: number }[] {
  const bars: { x: number; w: number }[] = [];
  if (!value) return bars;

  const digitsOnly = /^[0-9]+$/.test(value);
  const chars: number[] = [];
  let startCode: number;

  if (digitsOnly && value.length >= 2) {
    startCode = 105;
    chars.push(startCode);
    for (let i = 0; i < value.length; i += 2) {
      if (i + 1 < value.length) {
        chars.push(parseInt(value.substring(i, i + 2), 10));
      } else {
        chars.push(104);
        chars.push(value.charCodeAt(i) - 32);
      }
    }
  } else {
    startCode = 104;
    chars.push(startCode);
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      if (code >= 32 && code <= 126) chars.push(code - 32);
    }
  }

  let checksum = startCode;
  for (let i = 0; i < chars.length; i++) {
    checksum += chars[i] * (i === 0 ? 0 : i);
  }
  checksum = checksum % 103;
  chars.push(checksum);
  chars.push(106);

  const CODE128_PATTERNS: number[][] = [
    [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1],
    [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2],
    [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2],
    [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2],
    [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1],
    [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1],
    [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], [2, 2, 1, 2, 3, 1],
    [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1],
    [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1],
    [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1],
    [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1],
    [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1],
    [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1],
    [2, 1, 1, 3, 1, 3], [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1],
    [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1],
    [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1],
    [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1],
    [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1],
    [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1],
    [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1],
    [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1],
    [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4],
    [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4],
    [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1],
    [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1],
    [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], [1, 1, 1, 2, 4, 2],
    [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2],
    [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2],
    [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1],
    [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3],
    [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3],
    [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1],
    [1, 1, 3, 1, 4, 1], [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1],
    [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4],
    [2, 1, 1, 2, 3, 2], [2, 3, 3, 1, 1, 1, 2],
  ];

  const totalWidth = chars.reduce((sum, idx) => sum + CODE128_PATTERNS[idx].reduce((s, v) => s + v, 0), 0);
  const singleUnit = width / totalWidth;
  let xPos = 0;

  for (let i = 0; i < chars.length; i++) {
    const p = CODE128_PATTERNS[chars[i]];
    for (let j = 0; j < p.length; j++) {
      const w = p[j] * singleUnit;
      if (j % 2 === 0) bars.push({ x: xPos, w });
      xPos += w;
    }
  }

  return bars;
}
