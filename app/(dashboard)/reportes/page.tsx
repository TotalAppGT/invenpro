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
import { generatePDF, generateExcel, downloadFile, PDFColumn } from "@/lib/pdf-generator";
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
  { type: "catalogo", label: "Cat\u00e1logo de Productos", description: "Listado completo de productos con precios", icon: <Package className="h-6 w-6" />, color: "text-indigo-400" },
  { type: "stock_bajo", label: "Alerta de Stock Bajo", description: "Productos bajo el nivel m\u00ednimo de inventario", icon: <AlertTriangle className="h-6 w-6" />, color: "text-amber-400" },
];

const bodegas = ["TODAS", "Bodega Central", "Bodega Norte", "Bodega Sur", "Bodega Este"];
const categorias = ["TODAS", "Ferreter\u00eda", "Electr\u00f3nicos", "Construcci\u00f3n", "Papeler\u00eda", "Pintura"];

const REPORT_LABELS: Record<ReportType, string> = {
  inventario: "Inventario General",
  movimientos: "Movimientos",
  catalogo: "Cat\u00e1logo de Productos",
  stock_bajo: "Alerta de Stock Bajo",
};

const REPORT_COLUMNS: Record<ReportType, PDFColumn[]> = {
  inventario: [
    { header: "C\u00f3digo", dataKey: "col1" },
    { header: "Producto", dataKey: "col2" },
    { header: "Bodega", dataKey: "col3" },
    { header: "Cantidad", dataKey: "col4" },
    { header: "Valor Total", dataKey: "col5" },
  ],
  movimientos: [
    { header: "Fecha", dataKey: "col1" },
    { header: "Tipo", dataKey: "col2" },
    { header: "Producto", dataKey: "col3" },
    { header: "Cantidad", dataKey: "col4" },
    { header: "Bodega", dataKey: "col5" },
  ],
  catalogo: [
    { header: "C\u00f3digo", dataKey: "col1" },
    { header: "Producto", dataKey: "col2" },
    { header: "Categor\u00eda", dataKey: "col3" },
    { header: "Precio", dataKey: "col4" },
    { header: "Estado", dataKey: "col5" },
  ],
  stock_bajo: [
    { header: "C\u00f3digo", dataKey: "col1" },
    { header: "Producto", dataKey: "col2" },
    { header: "Bodega", dataKey: "col3" },
    { header: "Stock Actual", dataKey: "col4" },
    { header: "Stock M\u00edn", dataKey: "col5" },
  ],
};

function getCSVHeaders(type: ReportType): string[] {
  return REPORT_COLUMNS[type].map((c) => c.header);
}

function reportRowToRecord(row: ReportRow): Record<string, string> {
  return {
    col1: row.col1,
    col2: row.col2,
    col3: row.col3,
    col4: row.col4,
    col5: row.col5,
  };
}

function generateExcelFile(type: ReportType, rows: ReportRow[]) {
  const columns = REPORT_COLUMNS[type];
  const records = rows
    .filter((r) => r.col1 !== "" || r.col2 !== "" || r.col3 !== "" || r.col4 !== "" || r.col5 !== "")
    .map(reportRowToRecord);

  generateExcel({
    columns,
    rows: records,
    filename: `reporte_${type}_${new Date().toISOString().slice(0, 10)}.csv`,
  });
}

function generatePDFReport(type: ReportType, rows: ReportRow[]) {
  const reportLabel = REPORT_LABELS[type];
  const columns = REPORT_COLUMNS[type];
  const records = rows
    .filter((r) => r.col1 !== "" || r.col2 !== "" || r.col3 !== "" || r.col4 !== "" || r.col5 !== "")
    .map(reportRowToRecord);

  generatePDF({
    title: reportLabel,
    subtitle: `Reporte generado el ${formatDate(new Date())}`,
    columns,
    rows: records,
    filename: `reporte_${type}_${new Date().toISOString().slice(0, 10)}.pdf`,
    orientation: "landscape",
    companyName: "InvenPro",
    showPageNumbers: true,
  });
}

function copyTableToClipboard(type: ReportType, rows: ReportRow[]) {
  const headers = getCSVHeaders(type).join("\t");
  const bodyLines = rows
    .filter((r) => r.col1 !== "" || r.col2 !== "" || r.col3 !== "" || r.col4 !== "" || r.col5 !== "")
    .map((r) => [r.col1, r.col2, r.col3, r.col4, r.col5].join("\t"));
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
  const [generatingText, setGeneratingText] = useState("");
  const [previewData, setPreviewData] = useState<ReportRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [apiData, setApiData] = useState<Record<string, unknown>[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

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
    setErrorMessage("");
    updateUrl("tipo", type);
  };

  const fetchReportData = useCallback(async (): Promise<ReportRow[]> => {
    setErrorMessage("");
    const tipo = selectedReport === "catalogo" ? "productos" : selectedReport;
    const params = new URLSearchParams({ tipo });
    if (bodegaFilter !== "TODAS") params.set("bodega", bodegaFilter);
    if (categoryFilter !== "TODAS") params.set("categoria", categoryFilter);
    if (dateFrom) params.set("desde", dateFrom);
    if (dateTo) params.set("hasta", dateTo);
    if (tipoMov !== "TODOS") params.set("tipoMov", tipoMov);

    try {
      const res = await fetch(`/api/reportes?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data && Array.isArray(json.data) && json.data.length > 0) {
        setApiData(json.data);
        const mapped = json.data.map((item: Record<string, unknown>) => {
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
            row.col5 = String(item.estado ?? "ACTIVO");
          } else if (selectedReport === "stock_bajo") {
            row.col1 = String(item.codigo ?? "");
            row.col2 = String(item.producto ?? "");
            row.col3 = String(item.bodega ?? "");
            row.col4 = String(item.stockActual ?? "");
            row.col5 = String(item.stockMin ?? "");
          }
          return row;
        });
        return mapped;
      }
      setErrorMessage(json.error || "No se encontraron datos para este reporte");
    } catch (err) {
      console.error("Error fetching report data:", err);
      setErrorMessage("Error de conexi\u00f3n al obtener datos del reporte");
    }
    return generateMockData();
  }, [selectedReport, bodegaFilter, dateFrom, dateTo, tipoMov, categoryFilter]);

  const generateMockData = (): ReportRow[] => {
    return Array.from({ length: 50 }, (_, i) => {
      const row = { ...EMPTY_ROW };
      if (selectedReport === "inventario") {
        row.col1 = `PRD-${String(i + 1).padStart(4, "0")}`;
        row.col2 = `Producto ${i + 1}`;
        row.col3 = bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % (bodegas.length - 1)) + 1];
        row.col4 = String(Math.floor(Math.random() * 200) + (i % 5 === 0 ? 1 : 10));
        row.col5 = formatCurrency(Math.round((Math.random() * 500 + 10) * (Math.random() * 100 + 1) * 100) / 100);
      } else if (selectedReport === "movimientos") {
        const tipos = ["ENTRADA", "SALIDA", "AJUSTE", "TRASLADO"];
        row.col1 = formatDate(new Date(Date.now() - i * 86400000));
        row.col2 = tipoMov !== "TODOS" ? tipoMov : tipos[i % 4];
        row.col3 = `Producto ${i + 1}`;
        row.col4 = String(Math.floor(Math.random() * 50) + 1);
        row.col5 = bodegas[(i % 4) + 1];
      } else if (selectedReport === "catalogo") {
        row.col1 = `PRD-${String(i + 1).padStart(4, "0")}`;
        row.col2 = `Producto ${i + 1}`;
        row.col3 = categoryFilter !== "TODAS" ? categoryFilter : categorias[(i % (categorias.length - 1)) + 1];
        row.col4 = formatCurrency(Math.round((Math.random() * 800 + 20) * 100) / 100);
        row.col5 = ["ACTIVO", "ACTIVO", "INACTIVO", "DESCONTINUADO"][i % 4];
      } else {
        row.col1 = `PRD-${String(i + 1).padStart(4, "0")}`;
        row.col2 = `Producto ${i + 1}`;
        row.col3 = bodegaFilter !== "TODAS" ? bodegaFilter : bodegas[(i % 4) + 1];
        row.col4 = String(Math.floor(Math.random() * 5) + 1);
        row.col5 = String(Math.floor(Math.random() * 10) + 5);
      }
      return row;
    });
  };

  const generatePreview = async () => {
    setLoading(true);
    setShowPreview(false);
    setErrorMessage("");

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
    setGeneratingText(`Generando ${label}...`);

    let data = previewData;
    if (data.length === 0) {
      data = await fetchReportData();
    }

    setTimeout(() => {
      if (format === "pdf") {
        generatePDFReport(selectedReport, data);
      } else {
        generateExcelFile(selectedReport, data);
      }

      toast.success(`Reporte ${label} descargado exitosamente`);
      setGenerating(null);
      setGeneratingText("");
    }, 300);
  };

  const getPreviewHeaders = () => {
    return getCSVHeaders(selectedReport);
  };

  const getPreviewRowData = (row: ReportRow): string[] => {
    return [row.col1, row.col2, row.col3, row.col4, row.col5];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Reportes</h1>
        <p className="text-sm text-muted-foreground">Generaci\u00f3n de reportes y exportaci\u00f3n de datos</p>
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
          <CardTitle className="text-white">Configuraci\u00f3n del Reporte</CardTitle>
          <CardDescription>{reportTypes.find((r) => r.type === selectedReport)?.label}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            {(selectedReport === "inventario" || selectedReport === "stock_bajo") && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bodega</Label>
                <select
                  value={bodegaFilter}
                  onChange={(e) => {
                    setBodegaFilter(e.target.value);
                    updateUrl("bodega", e.target.value !== "TODAS" ? e.target.value : "");
                  }}
                  className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                >
                  {bodegas.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedReport === "movimientos" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <select
                    value={tipoMov}
                    onChange={(e) => setTipoMov(e.target.value)}
                    className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                  >
                    <option value="TODOS">Todos</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste</option>
                    <option value="TRASLADO">Traslado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Bodega</Label>
                  <select
                    value={bodegaFilter}
                    onChange={(e) => setBodegaFilter(e.target.value)}
                    className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                  >
                    {bodegas.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {selectedReport === "catalogo" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Categor\u00eda</Label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white"
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 self-end">
              <Button variant="outline" size="sm" onClick={() => handleAction("pdf")} disabled={!!generating}>
                {generating === "pdf" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-1 h-4 w-4" />
                )}
                {generating === "pdf" ? generatingText : "PDF"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction("excel")} disabled={!!generating}>
                {generating === "excel" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1 h-4 w-4" />
                )}
                {generating === "excel" ? generatingText : "Excel"}
              </Button>
              <Button size="sm" onClick={() => handleAction("preview")} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-1 h-4 w-4" />
                )}
                Vista Previa
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-400">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {showPreview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Vista Previa</CardTitle>
                  <CardDescription>
                    Primeros {previewData.length} resultados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyTableToClipboard(selectedReport, previewData)}>
                    <Copy className="mr-1 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAction("pdf")}>
                    <Printer className="mr-1 h-4 w-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#0a0a2a]">
                      <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                        {getPreviewHeaders().map((h) => (
                          <th key={h} className="pb-3 pr-4 font-medium whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => {
                        const cols = getPreviewRowData(row);
                        if (!cols.some((c) => c !== "")) return null;
                        return (
                          <tr key={i} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                            {cols.map((val, j) => (
                              <td
                                key={j}
                                className={`py-2.5 pr-4 whitespace-nowrap ${
                                  j === 0 ? "font-mono text-xs text-indigo-400" : "text-white"
                                }`}
                              >
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
