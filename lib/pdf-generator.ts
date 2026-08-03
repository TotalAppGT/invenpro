import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatDate } from "@/lib/utils";

export interface PDFColumn {
  header: string;
  dataKey: string;
}

export interface ExcelColumn {
  header: string;
  dataKey: string;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
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

export interface GeneratePDFOptions {
  title: string;
  subtitle?: string;
  columns: PDFColumn[];
  rows: Record<string, string | number>[];
  filename: string;
  orientation?: "portrait" | "landscape";
  companyName?: string;
  showPageNumbers?: boolean;
  summaryData?: { label: string; value: string }[];
}

export function generatePDF(options: GeneratePDFOptions): void {
  const {
    title,
    subtitle,
    columns,
    rows,
    filename,
    orientation = "landscape",
    companyName = "InvenPro",
    showPageNumbers = true,
    summaryData,
  } = options;

  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 15, 46);
  doc.rect(0, 0, pageWidth, 20, "F");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(companyName, 14, 13);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gesti\u00f3n de Inventario", 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(40, 40, 80);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 30);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text(`Generado: ${formatDate(new Date())}`, 14, 36);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 100);
    doc.text(subtitle, 14, 42);
  }

  const startY = subtitle ? 48 : 42;
  const headers = columns.map((c) => c.header);
  const bodyData: string[][] = rows.map((row) =>
    columns.map((col) => String(row[col.dataKey] ?? ""))
  );

  (doc as any).autoTable({
    startY,
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
    didDrawPage: showPageNumbers
      ? () => {
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const totalPages = (doc as any).internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(130, 130, 150);
          doc.setFont("helvetica", "normal");
          doc.text(`P\u00e1gina ${pageNum} de ${totalPages}`, pageWidth - 25, pageHeight - 8, {
            align: "right",
          });
          doc.text(`${companyName} - Reporte`, 10, pageHeight - 8);
        }
      : undefined,
  });

  if (summaryData && summaryData.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 10;
    const summaryStartY = finalY + 10;

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 80);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen", 14, summaryStartY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    summaryData.forEach((item, idx) => {
      const y = summaryStartY + 6 + idx * 5;
      doc.setTextColor(80, 80, 100);
      doc.text(`${item.label}:`, 14, y);
      doc.setTextColor(30, 30, 50);
      doc.setFont("helvetica", "bold");
      doc.text(item.value, 60, y);
      doc.setFont("helvetica", "normal");
    });
  }

  doc.save(filename);
}

export interface GenerateExcelOptions {
  columns: ExcelColumn[];
  rows: Record<string, string | number>[];
  filename: string;
}

export function generateExcel(options: GenerateExcelOptions): void {
  const { columns, rows, filename } = options;

  let csv = "\uFEFF";
  csv += columns.map((c) => `"${c.header}"`).join(",") + "\n";

  for (const row of rows) {
    csv +=
      columns
        .map((col) => {
          const val = String(row[col.dataKey] ?? "");
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(",") + "\n";
  }

  downloadFile(csv, filename, "text/csv");
}
