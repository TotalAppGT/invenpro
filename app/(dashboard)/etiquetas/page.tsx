"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tags,
  Printer,
  FileText,
  Download,
  Plus,
  Search,
  X,
  Package,
  Barcode,
  Loader2,
  Check,
  ChevronDown,
  ScanLine,
  Settings,
  Trash2,
  Copy,
  Grid3X3,
  Layers,
} from "lucide-react";
import jsPDF from "jspdf";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import BarcodeGenerator, { barcodeToDataURL } from "@/components/barcode-generator";
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
  {
    id: "small",
    name: "Pequeña",
    width: 50,
    height: 25,
    columns: 4,
    rows: 10,
    label: "50x25mm",
  },
  {
    id: "medium",
    name: "Mediana",
    width: 70,
    height: 35,
    columns: 3,
    rows: 8,
    label: "70x35mm",
  },
  {
    id: "large",
    name: "Grande",
    width: 100,
    height: 50,
    columns: 2,
    rows: 5,
    label: "100x50mm",
  },
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
        {
          ...producto,
          quantity: copiesPerProduct,
          showPrice: showPriceOnLabel,
          customText: "",
        },
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
      (p) =>
        p.codigoBarras === barcodeInput.trim() ||
        p.codigo === barcodeInput.trim()
    );
    if (found) {
      addProduct(found);
    }
    setBarcodeInput("");
  };

  const generatePDF = async () => {
    if (selectedProducts.length === 0) return;
    setGenerating(true);

    try {
      const template = selectedTemplate;
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 10;
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2;
      const labelW = template.width;
      const labelH = template.height;
      const gapX = 2;
      const gapY = 2;
      const cols = Math.floor((usableWidth + gapX) / (labelW + gapX));
      const rows = Math.floor((usableHeight + gapY) / (labelH + gapY));

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      let currentPage = 0;

      const allLabels: { producto: SelectedProduct; barcodeValue: string }[] = [];
      for (const sp of selectedProducts) {
        const barcodeVal = sp.codigoBarras || sp.codigo;
        for (let i = 0; i < sp.quantity; i++) {
          allLabels.push({ producto: sp, barcodeValue: barcodeVal });
        }
      }

      for (let idx = 0; idx < allLabels.length; idx++) {
        const labelIdx = idx % (cols * rows);
        const col = labelIdx % cols;
        const row = Math.floor(labelIdx / cols);

        const x = marginX + col * (labelW + gapX);
        const y = marginY + row * (labelH + gapY);

        const { producto, barcodeValue } = allLabels[idx];

        const barcodeSvg = barcodeToDataURL(barcodeValue, "CODE128", 200, 40);

        doc.setDrawColor(200);
        doc.setLineWidth(0.1);
        doc.roundedRect(x, y, labelW, labelH, 1, 1, "S");

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(COMPANY_NAME, x + 1, y + 5, { maxWidth: labelW - 2 });

        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        const nameLines = doc.splitTextToSize(producto.nombre, labelW - 2);
        if (nameLines.length > 0) {
          doc.text(nameLines[0], x + 1, y + 9, { maxWidth: labelW - 2 });
        }

        if (barcodeSvg) {
          try {
            doc.addImage(
              barcodeSvg,
              "SVG",
              x + labelW / 2 - 20,
              y + 12,
              40,
              8
            );
          } catch {
            doc.setFontSize(5);
            doc.text(barcodeValue, x + labelW / 2, y + 16, {
              align: "center",
              maxWidth: labelW - 2,
            });
          }
        }

        doc.setFontSize(5);
        doc.text(barcodeValue, x + labelW / 2, y + 21, {
          align: "center",
          maxWidth: labelW - 2,
        });

        if (showPriceOnLabel && producto.precioUnit > 0) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "bold");
          doc.text(formatCurrency(producto.precioUnit), x + labelW / 2, y + labelH - 2, {
            align: "center",
          });
        }

        const extraText = producto.customText || customGlobalText;
        if (extraText) {
          doc.setFontSize(4);
          doc.text(extraText, x + labelW / 2, y + labelH - 5, {
            align: "center",
            maxWidth: labelW - 2,
          });
        }

        if (idx < allLabels.length - 1 && Math.floor((idx + 1) / (cols * rows)) > currentPage) {
          currentPage = Math.floor(idx / (cols * rows));
          doc.addPage();
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
    window.print();
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
        return [
          ...prev,
          { ...prod, quantity: copiesPerProduct, showPrice: showPriceOnLabel, customText: "" },
        ];
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Tags className="h-8 w-8 text-primary" />
                Generador de Etiquetas
              </h1>
              <p className="mt-1 text-muted-foreground">
                Códigos de barras profesionales para tus productos
              </p>
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
                  <Settings className="h-5 w-5 text-primary" />
                  Configuración
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_TEMPLATES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.label})
                        </SelectItem>
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
                  <Checkbox
                    id="showPrice"
                    checked={showPriceOnLabel}
                    onCheckedChange={(v) => setShowPriceOnLabel(!!v)}
                  />
                  <Label htmlFor="showPrice" className="cursor-pointer">
                    Mostrar precio
                  </Label>
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
                  <ScanLine className="h-5 w-5 text-primary" />
                  Escanear / Buscar
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleScanBarcode();
                            }
                          }}
                        />
                      </div>
                      <Button variant="outline" onClick={handleScanBarcode}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>

                    <div ref={searchRef} className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar producto..."
                          className="pl-10"
                          value={productoSearch}
                          onChange={(e) => {
                            setProductoSearch(e.target.value);
                            setShowDropdown(true);
                          }}
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
                                    {p.precioUnit > 0 && (
                                      <span>{formatCurrency(p.precioUnit)}</span>
                                    )}
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
                        onClick={() => {
                          setBatchSelectMode(!batchSelectMode);
                          setSelectedBatch(new Set());
                        }}
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
                            <Checkbox
                              checked={selectedBatch.has(p.id)}
                              className="pointer-events-none"
                            />
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
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Agregue productos para generar etiquetas
                  </p>
                ) : (
                  selectedProducts.map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center gap-2 rounded-md border border-white/5 bg-muted/20 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{sp.nombre}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{sp.codigo}</span>
                          <span>x{sp.quantity}</span>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        className="w-16 h-8 text-xs"
                        value={sp.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setSelectedProducts((prev) =>
                            prev.map((p) =>
                              p.id === sp.id ? { ...p, quantity: val } : p
                            )
                          );
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeProduct(sp.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  onClick={generatePDF}
                  disabled={selectedProducts.length === 0 || generating}
                  className="flex-1"
                >
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Generar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrint}
                  disabled={selectedProducts.length === 0}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
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
                  <Barcode className="h-5 w-5 text-primary" />
                  Vista Previa
                </CardTitle>
                <CardDescription>
                  {selectedTemplate.name} ({selectedTemplate.label}) - Disposición: {selectedTemplate.columns}x{selectedTemplate.rows} por página
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
                          <div
                            key={sp.id}
                            className="flex flex-col items-center rounded-lg border border-white/10 bg-white p-3"
                          >
                            <div
                              className="flex flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50"
                              style={{
                                width: canvasW,
                                height: canvasH,
                              }}
                            >
                              <span className="text-[8px] font-bold text-gray-700">
                                {COMPANY_NAME}
                              </span>
                              <span
                                className="text-[7px] text-gray-600 truncate max-w-full px-1 text-center"
                              >
                                {sp.nombre}
                              </span>
                              <div className="my-0.5">
                                <BarcodeGenerator
                                  value={barcodeVal}
                                  width={canvasW * 0.85}
                                  height={canvasH * 0.35}
                                  format="CODE128"
                                  displayValue={false}
                                />
                              </div>
                              <span className="text-[6px] text-gray-500">
                                {barcodeVal}
                              </span>
                              {showPriceOnLabel && sp.precioUnit > 0 && (
                                <span className="text-[8px] font-bold text-gray-900 mt-0.5">
                                  {formatCurrency(sp.precioUnit)}
                                </span>
                              )}
                              {(sp.customText || customGlobalText) && (
                                <span className="text-[5px] text-gray-400">
                                  {sp.customText || customGlobalText}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2 w-full">
                              <span className="text-xs text-foreground truncate flex-1">
                                {sp.nombre}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                x{sp.quantity}
                              </Badge>
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
