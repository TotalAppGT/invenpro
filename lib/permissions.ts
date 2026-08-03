import type { Rol } from "@prisma/client";

export type Permission =
  | "view_dashboard"
  | "manage_bodegas"
  | "manage_productos"
  | "manage_inventario"
  | "manage_movimientos"
  | "manage_proveedores"
  | "manage_usuarios"
  | "manage_categorias"
  | "view_reportes"
  | "manage_conteos"
  | "manage_configuracion"
  | "export_data"
  | "import_data"
  | "manage_subscription"
  | "view_kardex"
  | "manage_alertas"
  | "generate_barcode"
  | "api_access";

const ADMIN_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "manage_bodegas",
  "manage_productos",
  "manage_inventario",
  "manage_movimientos",
  "manage_proveedores",
  "manage_usuarios",
  "manage_categorias",
  "view_reportes",
  "manage_conteos",
  "manage_configuracion",
  "export_data",
  "import_data",
  "manage_subscription",
  "view_kardex",
  "manage_alertas",
  "generate_barcode",
  "api_access",
];

const SUPERVISOR_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "manage_bodegas",
  "manage_productos",
  "manage_inventario",
  "manage_movimientos",
  "manage_proveedores",
  "manage_categorias",
  "view_reportes",
  "manage_conteos",
  "export_data",
  "import_data",
  "view_kardex",
  "manage_alertas",
  "generate_barcode",
];

const OPERADOR_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "manage_productos",
  "manage_inventario",
  "manage_movimientos",
  "manage_proveedores",
  "manage_categorias",
  "view_reportes",
  "manage_conteos",
  "import_data",
  "view_kardex",
  "generate_barcode",
];

const CONSULTOR_PERMISSIONS: Permission[] = [
  "view_dashboard",
  "view_reportes",
  "view_kardex",
];

const ROLE_PERMISSIONS: Record<Rol, Permission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  SUPERVISOR: SUPERVISOR_PERMISSIONS,
  OPERADOR: OPERADOR_PERMISSIONS,
  CONSULTOR: CONSULTOR_PERMISSIONS,
};

export function can(rol: Rol, action: Permission): boolean {
  return ROLE_PERMISSIONS[rol]?.includes(action) ?? false;
}

export function canAny(rol: Rol, actions: Permission[]): boolean {
  return actions.some((action) => can(rol, action));
}

export function canAll(rol: Rol, actions: Permission[]): boolean {
  return actions.every((action) => can(rol, action));
}

export function getPermissions(rol: Rol): Permission[] {
  return ROLE_PERMISSIONS[rol] ?? [];
}

export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    view_dashboard: "Ver Dashboard",
    manage_bodegas: "Gestionar Bodegas",
    manage_productos: "Gestionar Productos",
    manage_inventario: "Gestionar Inventario",
    manage_movimientos: "Gestionar Movimientos",
    manage_proveedores: "Gestionar Proveedores",
    manage_usuarios: "Gestionar Usuarios",
    manage_categorias: "Gestionar Categorías",
    view_reportes: "Ver Reportes",
    manage_conteos: "Gestionar Conteos",
    manage_configuracion: "Gestionar Configuración",
    export_data: "Exportar Datos",
    import_data: "Importar Datos",
    manage_subscription: "Gestionar Suscripción",
    view_kardex: "Ver Kardex",
    manage_alertas: "Gestionar Alertas",
    generate_barcode: "Generar Códigos de Barras",
    api_access: "Acceso API",
  };
  return labels[permission] ?? permission;
}

export function getPermissionGroup(permission: Permission): string {
  const groups: Record<Permission, string> = {
    view_dashboard: "General",
    manage_bodegas: "Inventario",
    manage_productos: "Inventario",
    manage_inventario: "Inventario",
    manage_movimientos: "Movimientos",
    manage_proveedores: "Inventario",
    manage_categorias: "Inventario",
    view_reportes: "Reportes",
    view_kardex: "Reportes",
    manage_conteos: "Inventario",
    manage_usuarios: "Administración",
    manage_configuracion: "Administración",
    manage_subscription: "Administración",
    export_data: "Datos",
    import_data: "Datos",
    manage_alertas: "Administración",
    generate_barcode: "Inventario",
    api_access: "Desarrollo",
  };
  return groups[permission] ?? "General";
}

export function getAllPermissionGroups(): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const permission of Object.keys(getPermissionGroup) as unknown as Permission[]) {
    const group = getPermissionGroup(permission);
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(permission);
  }
  return groups;
}
