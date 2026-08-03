import type {
  Tenant,
  User,
  Bodega,
  Categoria,
  Producto,
  Proveedor,
  Inventario,
  Movimiento,
  Conteo,
  ConteoItem,
  Alerta,
  SubscriptionPlan,
  Plan,
  Rol,
  TenantStatus,
  UserStatus,
  ProductoEstado,
  MovimientoTipo,
  ConteoEstado,
  AlertaTipo,
  AlertaCanal,
} from "@prisma/client";

export type {
  Tenant,
  User,
  Bodega,
  Categoria,
  Producto,
  Proveedor,
  Inventario,
  Movimiento,
  Conteo,
  ConteoItem,
  Alerta,
  SubscriptionPlan,
  Plan,
  Rol,
  TenantStatus,
  UserStatus,
  ProductoEstado,
  MovimientoTipo,
  ConteoEstado,
  AlertaTipo,
  AlertaCanal,
};

export interface Feature {
  id: string;
  label: string;
  description: string;
  included: boolean;
}

export interface PlanLimits {
  maxUsers: number;
  maxBodegas: number;
  maxProductos: number;
  maxMovimientos: number;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
}

export type ProductoWithRelations = Producto & {
  categoria: Categoria;
  proveedor: Proveedor | null;
  inventarios: (Inventario & { bodega: Bodega })[];
};

export type MovimientoWithRelations = Movimiento & {
  producto: Producto;
  bodega: Bodega;
  bodegaDestino: Bodega | null;
  usuario: Pick<User, "id" | "nombre" | "email">;
};

export type ConteoWithRelations = Conteo & {
  bodega: Bodega;
  usuario: Pick<User, "id" | "nombre">;
  items: ConteoItemWithProducto[];
};

export type ConteoItemWithProducto = ConteoItem & {
  producto: Producto | null;
};

export type InventarioWithRelations = Inventario & {
  bodega: Bodega;
  producto: Producto;
};

export type TenantWithCounts = Tenant & {
  _count: {
    users: number;
    bodegas: number;
    productos: number;
    movimientos: number;
  };
};

export type UserWithTenant = User & {
  tenant: Tenant;
};

export interface DashboardStats {
  totalProductos: number;
  totalBodegas: number;
  totalProveedores: number;
  totalUsuarios: number;
  stockBajo: number;
  totalInventarioValor: number;
  movimientosHoy: number;
  productosVencidos: number;
  conteosActivos: number;
  entradasMes: number;
  salidasMes: number;
}

export interface DashboardChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface KardexEntry {
  fecha: Date;
  tipo: MovimientoTipo;
  documento: string | null;
  detalle: string | null;
  entrada: number;
  salida: number;
  saldo: number;
  costoUnit: number | null;
  costoTotal: number | null;
}

export interface MovimientosFiltros {
  page?: number;
  limit?: number;
  tipo?: MovimientoTipo;
  productoId?: string;
  bodegaId?: string;
  usuarioId?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  ordenarPor?: string;
  direccion?: "asc" | "desc";
}

export interface ProductosFiltros {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  proveedorId?: string;
  estado?: ProductoEstado;
  stockBajo?: boolean;
  ordenarPor?: string;
  direccion?: "asc" | "desc";
}

export interface BodegasFiltros {
  page?: number;
  limit?: number;
  search?: string;
  activa?: boolean;
}

export interface ConteosFiltros {
  page?: number;
  limit?: number;
  estado?: ConteoEstado;
  bodegaId?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
}

export interface AlertasFiltros {
  page?: number;
  limit?: number;
  tipo?: AlertaTipo;
  activa?: boolean;
  productoId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface LoginRequest {
  idToken: string;
}

export interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  user?: UserWithTenant;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  empresa: string;
  telefono?: string;
}

export interface RegisterResponse {
  success: boolean;
  tenantId?: string;
  userId?: string;
  error?: string;
}

export interface InviteUserRequest {
  email: string;
  nombre: string;
  rol: Rol;
}

export interface CSVImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

export interface CSVExportOptions {
  type: "productos" | "movimientos" | "proveedores" | "inventario" | "conteos";
  filtros?: Record<string, unknown>;
  columns?: string[];
}

export interface StockAdjustment {
  productoId: string;
  bodegaId: string;
  cantidadActual: number;
  cantidadAjustada: number;
  diferencia: number;
  motivo: string;
  lote?: string;
}

export interface BatchMovement {
  productoId: string;
  cantidad: number;
  bodegaId?: string;
  bodegaDestinoId?: string;
}

export interface ReportOptions {
  tipo: "kardex" | "movimientos" | "inventario" | "stock_bajo" | "vencimientos";
  fechaInicio: Date;
  fechaFin: Date;
  bodegaId?: string;
  categoriaId?: string;
  productoId?: string;
  formato: "pdf" | "csv" | "excel";
}

export interface RecurrenteCheckoutResponse {
  url: string | null;
  checkoutId: string | null;
}

export interface SubscriptionInfo {
  plan: Plan;
  status: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  active: boolean;
  trialEndsAt?: Date | null;
}

export interface PlanComparison {
  plan: Plan;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceFormatted: string;
  yearlyPriceFormatted: string;
  maxUsers: number | string;
  maxBodegas: number | string;
  maxProductos: number | string;
  maxMovimientos: number | string;
  features: Feature[];
}

export interface TenantConfig {
  moneda: string;
  zonaHoraria: string;
  impuesto: number;
  redondeo: number;
  logo?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  website?: string;
  [key: string]: unknown;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  permission?: string;
  children?: NavItem[];
  badge?: string | number;
}

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  accessor?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
  hidden?: boolean;
}

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FileUploadState {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
}

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "doughnut"
  | "area";

export interface ChartConfig {
  type: ChartType;
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  options?: Record<string, unknown>;
}
