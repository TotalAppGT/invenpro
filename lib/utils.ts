import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `Q${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `Q${(amount / 1_000).toFixed(1)}K`;
  }
  return `Q${amount.toFixed(2)}`;
}

export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("es-GT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const rtf = new Intl.RelativeTimeFormat("es-GT", { numeric: "auto" });

  if (Math.abs(diffYear) >= 1) return rtf.format(-diffYear, "year");
  if (Math.abs(diffMonth) >= 1) return rtf.format(-diffMonth, "month");
  if (Math.abs(diffDay) >= 1) return rtf.format(-diffDay, "day");
  if (Math.abs(diffHour) >= 1) return rtf.format(-diffHour, "hour");
  if (Math.abs(diffMin) >= 1) return rtf.format(-diffMin, "minute");
  return rtf.format(-diffSec, "second");
}

export function generateId(prefix: string, length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${id}`;
}

export function generateBarcode(): string {
  const prefix = "779";
  let code = prefix;
  for (let i = 0; i < 9; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit;
}

export function generateSKU({
  categoryPrefix,
  brandPrefix,
  id,
}: {
  categoryPrefix: string;
  brandPrefix?: string;
  id: number | string;
}): string {
  const cat = categoryPrefix.slice(0, 3).toUpperCase().padEnd(3, "X");
  const brand = brandPrefix
    ? brandPrefix.slice(0, 3).toUpperCase().padEnd(3, "X")
    : "XXX";
  const numId = typeof id === "string" ? id.slice(0, 6).toUpperCase() : id.toString().padStart(6, "0");
  return `${cat}-${brand}-${numId}`;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else if (char === "\t" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else if (char === ";" && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV<T>(
  content: string,
  mapper: (row: Record<string, string>) => T
): T[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/\s+/g, "_")
  );

  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      record[header] = values[i] ?? "";
    });
    return mapper(record);
  });
}

export function calculateProfitMargin(
  costo: number,
  precio: number
): number {
  if (precio === 0) return 0;
  return ((precio - costo) / precio) * 100;
}

export function calculateInventoryValue(
  quantity: number,
  unitCost: number
): number {
  return quantity * unitCost;
}

export function calculateStockPercentage(
  current: number,
  max: number
): number {
  if (max === 0) return 0;
  return Math.min((current / max) * 100, 100);
}

export function isLowStock(current: number, min: number): boolean {
  return current <= min;
}

export function isExpiringSoon(
  expDate: Date | string,
  daysThreshold = 30
): boolean {
  const now = new Date();
  const expiry = new Date(expDate);
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= daysThreshold && diffDays >= 0;
}

export function getStatusColor(
  status: string
): "default" | "success" | "warning" | "danger" {
  const map: Record<string, "default" | "success" | "warning" | "danger"> = {
    ACTIVO: "success",
    INACTIVO: "default",
    SUSPENDIDO: "warning",
    CANCELADO: "danger",
    TRIAL: "warning",
    ABIERTO: "default",
    EN_PROCESO: "warning",
    CERRADO: "default",
    CONCILIADO: "success",
    ENTRADA: "success",
    SALIDA: "danger",
    AJUSTE: "warning",
    TRASLADO: "default",
    CONTEO_DIFERENCIA: "warning",
  };
  return map[status] ?? "default";
}

export function getRandomColor(seed: string): string {
  const colors = [
    "#1a56db",
    "#047481",
    "#7e3af2",
    "#d03801",
    "#10898d",
    "#e02424",
    "#5850ec",
    "#1c64f2",
    "#0e9f6e",
    "#c81e1e",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
