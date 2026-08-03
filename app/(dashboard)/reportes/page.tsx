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
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  FileText, Download, Eye, ClipboardList, ArrowLeftRight, Package, AlertTriangle, Calendar,
  BarChart3, Printer, Copy, Loader2,
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

interface ReportRow {
  codigo: string;
  producto: string;
  nombre: string;
  bodega: string;
  cantidad: string;
  valorTotal: string;
  categoria: string;
  fecha: string;
  tipo: string;
  precio: string;
  estado: string;
  stockActual: string;
  stockMin: string;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  col5: string;
}

const EMPTY_ROW: ReportRow = {
  codigo: "", producto: "", nombre: "", bodega: "", cantidad: "", valorTotal: "",
  categoria: "", fecha: "", tipo: "", precio: "", estado: "", stockActual: "", stockMin: "",
  col1: "", col2: "", col3: "", col4: "", col5: "",
};

const reportTypes: ReportConfig[] = [
  { type: "inventario", label: "Inventario General", description: "Reporte completo del inventario por bodega", icon: <ClipboardList className="h-6 w-6" />, color: "text-blue-400" },
  { type: "movimientos", label: "Movimientos", description: "Historial de entradas, salidas y ajustes", icon: <ArrowLeftRight className="h-6 w-6" />, color: "text-emerald-400" },
  { type: "catalogo", label: "Catálogo de Productos", description: "Listado completo de productos con precios", icon: <Package className="h-6 w-6" />, color: "text-indigo-400" },
  { type: "stock_bajo", label: "Alerta de Stock Bajo", description: "Productos bajo el nivel mínimo de inventario", icon: <AlertTriangle className="h-6 w-6" />, color: "text-amber-400" },
];

const bodegas = ["TODAS", "Bodega Central", "Bodega Norte", "Bodega Sur", "Bodega Este"];
const categorias = ["TODAS", "Ferretería", "Electrónicos", "Construcción", "Papelería", "Pintura"];

const REPORT_LABELS: Record<ReportType, string> = {
  inventario: "Inventario General",
  movimientos: "Movimientos",
  catalogo: "Catálogo de Productos",
  stock_bajo: "Alerta de Stock Bajo",
};

function getCSVHeaders(type: ReportType): string[] {
  switch (type) {
    case "inventario": return ["Código", "Producto", "Bodega", "Cantidad", "Costo Unit.", "Precio Unit.", "Valor Total"];
    case "movimientos": return ["Fecha", "Tipo", "Producto", "Cantidad", "Costo Unit.", "Total", "Bodega", "Usuario"];
    case "catalogo": return ["Código", "Producto", "Categoría", "Unidad", "Costo Unit.", "Precio Unit.", "Stock Mín", "Stock Máx", "Estado"];
    case "stock_bajo": return ["Código", "Producto", "Bodega", "Stock Actual", "Stock Mín", "Déficit", "Proveedor"];
  }
}

function rowsToCSV(type: ReportType, rows: ReportRow[]): string {
  const headers = getCSVHeaders(type);
  let csv = "\uFEFF";
  csv += headers.map(h => `"${h}"`).join(",") + "\n";

  for (const row of rows) {
    if (row.col1 === "" && row.col2 === "" && row.col3 === "") continue;
    const vals = [row.col1, row.col2, row.col3, row.col4, row.col5];
    csv += vals.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
  }
  return csv;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generatePDF(type: ReportType, rows: ReportRow[], reportLabel: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 15, 46);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("InvenPro", 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestión de Inventario", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 80);
  doc.setFont("helvetica", "bold");
  doc.text(reportLabel, 14, 30);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text(`Generado: ${formatDate(new Date())}`, 14, 36);

  const headers = getCSVHeaders(type);
  const bodyData: string[][] = [];
  for (const row of rows) {
    if (row.col1 === "" && row.col2 === "" && row.col3 === "") continue;
    bodyData.push([row.col1, row.col2, row.col3, row.col4, row.col5]);
  }

  (doc as any).autoTable({
    startY: 40,
    head: [headers],
    body: bodyData,
    headStyles: {
      fillColor: [15, 15, 46],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 30, 50],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    styles: {
      overflow: "linebreak",
      halign: "left",
      lineWidth: 0.1,
    },
    margin: { left: 10, right: 10 },
    didDrawPage: () => {
      const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 150);
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 25, pageHeight - 8, { align: "right" });
      doc.text("InvenPro - Reporte", 10, pageHeight - 8);
    },
  });

  doc.save(`reporte_${type}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function generateExcelFile(type: ReportType, rows: ReportRow[]) {
  const csvContent = rowsToCSV(type, rows);
  downloadBlob(csvContent, `reporte_${type}_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
}

function copyTableToClipboard(type: ReportType, rows: ReportRow[]) {
  const headers = getCSVHeaders(type).join("\t");
  const bodyLines = rows
    .filter(r => r.col1 !== "" || r.col2 !== "" || r.col3 !== "")
    .map(r => [r.col1, r.col2, r.col3, r.col4, r.col5].join("\t"));
  const text = [headers, ...bodyLines].join("\n");
  navigator.clipboard.writeText(text).then(
    () => toast.success("Datos copiados al portapapeles"),
    () => toast.error("Error al copiar datos")
  );
}

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
  const [generating, setGenerating] = useState<"pdf" | "excel" | null>(null);
  const [previewData, setPreviewData] = useState<ReportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [apiData, setApiData] = useState<Record<string, unknown>[]>([]);

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
    setApiData([]);
    updateUrl("tipo", type);
  };

  const fetchReportData = useCallback(async (): Promise<ReportRow[]> => {
    const tipo = selectedReport === "catalogo" ? "productos" : selectedReport;
    const params = new URLSearchParams({ tipo });
    if (bodegaFilter !== "TODAS") params.set("bodega", bodegaFilter);
    if (dateFrom) params.set("desde", dateFrom);
    if (dateTo) params.set("hasta", dateTo);

    try {
      const res = await fetch(`/api/reportes?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setApiData(json.data);
        return json.data.map((item: Record<string, unknown>) => {
          const row = { ...EMPTY_ROW };
          if (selectedReport === "inventario") {
            row.col1 = String(item.codigo ?? "");
            row.col2 = String(item.producto ?? "");
            row.col3 = String(item.bodega ?? "");
            row.col4 = String(item.cantidad ?? "");
            row.col5 = formatCurrency(Number(item.valorTotal ?? 0));
          } else if (selectedReport === "movimientos") {
            row.col1 = formatDate(new Date(String(item.fecha ?? "")));
            row.col2 = String(item.tipo ?? "");
            row.col3 = String(item.producto ?? "");
            row.col4 = String(item.cantidad ?? "");
            row.col5 = String(item.bodega ?? "");
          } else if (selectedReport === "catalogo") {
            row.col1 = String(item.codigo ?? "");
            row.col2 = String(item.nombre ?? "");
            row.col3 = String(item.categoria ?? "");
            row.col4 = formatCurrency(Number(item.precioUnit ?? 0));
            row.col5 = "ACTIVO";
          } else if (selectedReport === "stock_bajo") {
            row.col1 = String(item.codigo ?? "");
            row.col2 = String(item.producto ?? "");
            row.col3 = String(item.bodega ?? "");
            row.col4 = String(item.stockActual ?? "");
            row.col5 = String(item.stockMin ?? "");
          }
          return row;
        });
      }
    } catch (err) {
      console.error("Error fetching report data:", err);
    }
    return generateMockData();
  }, [selectedReport, bodegaFilter, dateFrom, dateTo]);

  const generateMockData = (): ReportRow[] => {
    return Array.from({ length: 50 }, (_, i) => {
      if (selectedReport === "inventario") {
        return {
          ...EMPTY_ROW,
          col1: `PRD-${String(i + 1).padStart(4, "0")}`,
          col2: `Producto ${i + 1}`,
          col3: bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % (bodegas.length - 1)) + 1],
          col4: String(Math.floor(Math.random() * 200) + (i % 5 === 0 ? 1 : 10)),
          col5: formatCurrency(Math.round((Math.random() * 500 + 10) * (Math.random() * 100 + 1) * 100) / 100),
        };
      } else if (selectedReport === "movimientos") {
        const tipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"];
        return {
          ...EMPTY_ROW,
          col1: formatDate(new Date(Date.now() - i * 86400000)),
          col2: tipoMov !== "TODOS" ? tipoMov : tipos[i % 4],
          col3: `Producto ${i + 1}`,
          col4: String(Math.floor(Math.random() * 50) + 1),
          col5: bodegas[(i % 4) + 1],
        };
      } else if (selectedReport === "catalogo") {
        return {
          ...EMPTY_ROW,
          col1: `PRD-${String(i + 1).padStart(4, "0")}`,
          col2: `Producto ${i + 1}`,
          col3: categoryFilter !== "TODAS" ? categoryFilter : categorias[(i % (categorias.length - 1)) + 1],
          col4: formatCurrency(Math.round((Math.random() * 800 + 20) * 100) / 100),
          col5: ["ACTIVO", "ACTIVO", "INACTIVO", "DESCONTINUADO"][i % 4],
        };
      } else {
        return {
          ...EMPTY_ROW,
          col1: `PRD-${String(i + 1).padStart(4, "0")}`,
          col2: `Producto ${i + 1}`,
          col3: bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % 4) + 1],
          col4: String(Math.floor(Math.random() * 5) + 1),
          col5: String(Math.floor(Math.random() * 10) + 5),
        };
      }
    });
  };

  const generatePreview = async () => {
    setLoading(true);
    setShowPreview(false);

    const data = await fetchReportData();
    const limited = data.slice(0, 100);
    setPreviewData(limited);
    setShowPreview(true);
    setLoading(false);
  };

  const handleAction = async (format: Format) => {
    if (format === "preview") {
      generatePreview();
      return;
    }

    const label = format === "pdf" ? "PDF" : "Excel";
    const reportLabel = REPORT_LABELS[selectedReport];
    setGenerating(format);
    toast.success(`Preparando ${label} del reporte "${reportLabel}"...`);

    let data = previewData;
    if (data.length === 0) {
      data = await fetchReportData();
    }

    if (format === "pdf") {
      generatePDF(selectedReport, data, reportLabel);
    } else {
      generateExcelFile(selectedReport, data);
    }

    toast.success(`Reporte ${label} descargado exitosamente`);
    setGenerating(null);
  };

  const getPreviewHeaders = () => {
    return getCSVHeaders(selectedReport);
  };

  const getPreviewRowData = (row: ReportRow) => {
    return [row.col1, row.col2, row.col3, row.col4, row.col5];
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("pdf")}
                disabled={!!generating}
              >
                {generating === "pdf" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <FileText className="mr-1 h-4 w-4" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("excel")}
                disabled={!!generating}
              >
                {generating === "excel" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
                Excel
              </Button>
              <Button size="sm" onClick={() => handleAction("preview")} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Eye className="mr-1 h-4 w-4" />}
                Vista Previa
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
                  <CardDescription>Primeros {previewData.length} resultados</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyTableToClipboard(selectedReport, previewData)}>
                    <Copy className="mr-1 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAction("pdf")}>
                    <Printer className="mr-1 h-4 w-4" />Imprimir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#0a0a2a]">
                      <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                        {getPreviewHeaders().map((h) => (
                          <th key={h} className="pb-3 pr-4 font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => {
                        const cols = getPreviewRowData(row);
                        return (
                          <tr key={i} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                            {cols.map((val, j) => (
                              <td key={j} className={`py-2.5 pr-4 whitespace-nowrap ${j === 0 ? "font-mono text-xs text-indigo-400" : "text-white"}`}>
                                {val}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
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
