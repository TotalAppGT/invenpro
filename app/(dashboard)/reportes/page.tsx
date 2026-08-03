"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  FileText, Download, Eye, ClipboardList, ArrowLeftRight, Package, AlertTriangle, Calendar,
  BarChart3, Printer,
} from "lucide-react";

type ReportType = "inventario" | "movimientos" | "catalogo" | "stock_bajo";
type Format = "pdf" | "excel" | "preview";

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface PreviewRow {
  id: string;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
}

const reportTypes: ReportConfig[] = [
  { type: "inventario", label: "Inventario General", description: "Reporte completo del inventario por bodega", icon: <ClipboardList className="h-6 w-6" />, color: "text-blue-400" },
  { type: "movimientos", label: "Movimientos", description: "Historial de entradas, salidas y ajustes", icon: <ArrowLeftRight className="h-6 w-6" />, color: "text-emerald-400" },
  { type: "catalogo", label: "Catálogo de Productos", description: "Listado completo de productos con precios", icon: <Package className="h-6 w-6" />, color: "text-indigo-400" },
  { type: "stock_bajo", label: "Alerta de Stock Bajo", description: "Productos bajo el nivel mínimo de inventario", icon: <AlertTriangle className="h-6 w-6" />, color: "text-amber-400" },
];

const bodegas = ["TODAS", "Bodega Central", "Bodega Norte", "Bodega Sur", "Bodega Este"];
const categorias = ["TODAS", "Ferretería", "Electrónicos", "Construcción", "Papelería", "Pintura"];

export default function ReportesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<ReportType>("inventario");
  const [bodegaFilter, setBodegaFilter] = useState("TODAS");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tipoMov, setTipoMov] = useState("TODOS");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const type = searchParams.get("tipo") as ReportType;
    if (type && reportTypes.some((r) => r.type === type)) {
      setSelectedReport(type);
    }
  }, [searchParams]);

  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/reportes?${params.toString()}`, { scroll: false });
  };

  const handleSelectReport = (type: ReportType) => {
    setSelectedReport(type);
    setShowPreview(false);
    setPreviewData([]);
    updateUrl("tipo", type);
  };

  const generatePreview = () => {
    setLoading(true);
    setTimeout(() => {
      const mockData: PreviewRow[] = Array.from({ length: 50 }, (_, i) => {
        if (selectedReport === "inventario") {
          return {
            id: `r-${i + 1}`,
            col1: `PRD-${String(i + 1).padStart(4, "0")}`,
            col2: `Producto ${i + 1}`,
            col3: bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % (bodegas.length - 1)) + 1],
            col4: String(Math.floor(Math.random() * 200) + (i % 5 === 0 ? 1 : 10)),
            col5: formatCurrency(Math.round((Math.random() * 500 + 10) * (Math.random() * 100 + 1) * 100) / 100),
          };
        } else if (selectedReport === "movimientos") {
          const tipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"];
          return {
            id: `r-${i + 1}`,
            col1: formatDate(new Date(Date.now() - i * 86400000)),
            col2: tipoMov !== "TODOS" ? tipoMov : tipos[i % 4],
            col3: `Producto ${i + 1}`,
            col4: String(Math.floor(Math.random() * 50) + 1),
            col5: bodegas[(i % 4) + 1],
          };
        } else if (selectedReport === "catalogo") {
          return {
            id: `r-${i + 1}`,
            col1: `PRD-${String(i + 1).padStart(4, "0")}`,
            col2: `Producto ${i + 1}`,
            col3: categoryFilter !== "TODAS" ? categoryFilter : categorias[(i % (categorias.length - 1)) + 1],
            col4: formatCurrency(Math.round((Math.random() * 800 + 20) * 100) / 100),
            col5: ["ACTIVO", "ACTIVO", "INACTIVO", "DESCONTINUADO"][i % 4],
          };
        } else {
          return {
            id: `r-${i + 1}`,
            col1: `PRD-${String(i + 1).padStart(4, "0")}`,
            col2: `Producto ${i + 1}`,
            col3: bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % 4) + 1],
            col4: String(Math.floor(Math.random() * 5) + 1),
            col5: String(Math.floor(Math.random() * 10) + 5),
          };
        }
      });
      setPreviewData(mockData);
      setShowPreview(true);
      setLoading(false);
    }, 600);
  };

  const handleAction = (format: Format) => {
    if (format === "preview") {
      generatePreview();
      return;
    }
    const label = format === "pdf" ? "PDF" : "Excel";
    toast.success(`Generando ${label} del reporte "${reportTypes.find((r) => r.type === selectedReport)?.label}"...`);
  };

  const getPreviewHeaders = () => {
    switch (selectedReport) {
      case "inventario": return ["Código", "Producto", "Bodega", "Cantidad", "Valor Total"];
      case "movimientos": return ["Fecha", "Tipo", "Producto", "Cantidad", "Bodega"];
      case "catalogo": return ["Código", "Producto", "Categoría", "Precio", "Estado"];
      case "stock_bajo": return ["Código", "Producto", "Bodega", "Stock Actual", "Stock Mín"];
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reportes</h1>
        <p className="text-sm text-muted-foreground">Generación de reportes y exportación de datos</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {reportTypes.map((report) => (
          <motion.div key={report.type} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card
              className={cn(
                "cursor-pointer border transition-all",
                selectedReport === report.type
                  ? "border-indigo-500/30 bg-indigo-500/[0.04] shadow-lg shadow-indigo-500/5"
                  : "border-white/[0.04] bg-[#0a0a2a]/60 hover:bg-white/[0.02]"
              )}
              onClick={() => handleSelectReport(report.type)}
            >
              <CardContent className="p-5">
                <div className={cn("mb-3 rounded-lg bg-white/[0.02] p-2.5 inline-block", report.color)}>
                  {report.icon}
                </div>
                <h3 className="font-semibold text-white">{report.label}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{report.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Configuración del Reporte</CardTitle>
          <CardDescription>{reportTypes.find((r) => r.type === selectedReport)?.label}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {(selectedReport === "inventario" || selectedReport === "stock_bajo") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bodega</Label>
                <select
                  value={bodegaFilter}
                  onChange={(e) => { setBodegaFilter(e.target.value); updateUrl("bodega", e.target.value !== "TODAS" ? e.target.value : ""); }}
                  className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                >
                  {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}

            {(selectedReport === "movimientos") && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40 text-xs" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <select value={tipoMov} onChange={(e) => setTipoMov(e.target.value)} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                    <option value="TODOS">Todos</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste</option>
                    <option value="TRASLADO">Traslado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bodega</Label>
                  <select value={bodegaFilter} onChange={(e) => setBodegaFilter(e.target.value)} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                    {bodegas.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </>
            )}

            {(selectedReport === "catalogo") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Categoría</Label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white">
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-2 self-end">
              <Button variant="outline" size="sm" onClick={() => handleAction("pdf")}>
                <FileText className="mr-1 h-4 w-4" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction("excel")}>
                <Download className="mr-1 h-4 w-4" />Excel
              </Button>
              <Button size="sm" onClick={() => handleAction("preview")}>
                <Eye className="mr-1 h-4 w-4" />Vista Previa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Vista Previa</CardTitle>
                  <CardDescription>Primeros {Math.min(50, previewData.length)} resultados</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleAction("pdf")}>
                  <Printer className="mr-1 h-4 w-4" />Imprimir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                        {getPreviewHeaders().map((h) => (
                          <th key={h} className="pb-3 pr-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row) => (
                        <tr key={row.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                          <td className="py-2.5 pr-4 font-mono text-xs text-indigo-400">{row.col1}</td>
                          <td className="py-2.5 pr-4 text-white">{row.col2}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{row.col3}</td>
                          <td className="py-2.5 pr-4 text-white">{row.col4}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{row.col5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
