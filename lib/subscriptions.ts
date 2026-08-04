import type { Plan, Tenant } from "@prisma/client";
import type { Feature } from "@/types";

export const PLAN_FEATURES: Record<Plan, Feature[]> = {
  EMPRENDEDOR: [
    { id: "basic_inventory", label: "Inventario básico", description: "Gestión de productos y stock", included: true },
    { id: "csv_import", label: "Importación CSV", description: "Importar productos y proveedores vía CSV", included: true },
    { id: "basic_reports", label: "Reportes básicos", description: "Reportes de inventario y movimientos", included: true },
    { id: "email_alerts", label: "Alertas por email", description: "Notificaciones de stock bajo por correo", included: true },
    { id: "multi_user", label: "Hasta 3 usuarios", description: "Usuarios simultáneos en la plataforma", included: true },
    { id: "two_bodegas", label: "Hasta 2 bodegas", description: "Gestión de múltiples ubicaciones", included: true },
    { id: "whatsapp_alerts", label: "Alertas por WhatsApp", description: "Notificaciones vía WhatsApp Business", included: false },
    { id: "kardex", label: "Kardex valorizado", description: "Control de inventario valorizado por producto", included: false },
    { id: "conteos", label: "Conteos de inventario", description: "Conteos físicos y conciliación", included: false },
    { id: "barcode", label: "Escaneo de códigos", description: "Escaneo de códigos de barras", included: false },
    { id: "advanced_reports", label: "Reportes avanzados", description: "Reportes personalizados y exportación", included: false },
    { id: "priority_support", label: "Soporte prioritario", description: "Atención prioritaria vía chat y email", included: false },
    { id: "api_access", label: "Acceso API", description: "API REST para integraciones", included: false },
    { id: "custom_integrations", label: "Integraciones personalizadas", description: "Conexiones con sistemas externos", included: false },
    { id: "white_label", label: "White label", description: "Personalización con marca propia", included: false },
    { id: "dedicated_support", label: "Soporte dedicado", description: "Ejecutivo de cuenta asignado", included: false },
    { id: "sla", label: "SLA garantizado", description: "Acuerdo de nivel de servicio 99.9%", included: false },
  ],
  NEGOCIO: [
    { id: "basic_inventory", label: "Inventario básico", description: "Gestión de productos y stock", included: true },
    { id: "csv_import", label: "Importación CSV", description: "Importar productos y proveedores vía CSV", included: true },
    { id: "basic_reports", label: "Reportes básicos", description: "Reportes de inventario y movimientos", included: true },
    { id: "email_alerts", label: "Alertas por email", description: "Notificaciones de stock bajo por correo", included: true },
    { id: "multi_user", label: "Hasta 10 usuarios", description: "Usuarios simultáneos en la plataforma", included: true },
    { id: "ten_bodegas", label: "Hasta 10 bodegas", description: "Gestión de múltiples ubicaciones", included: true },
    { id: "whatsapp_alerts", label: "Alertas por WhatsApp", description: "Notificaciones vía WhatsApp Business", included: true },
    { id: "kardex", label: "Kardex valorizado", description: "Control de inventario valorizado por producto", included: true },
    { id: "conteos", label: "Conteos de inventario", description: "Conteos físicos y conciliación", included: true },
    { id: "barcode", label: "Escaneo de códigos", description: "Escaneo de códigos de barras", included: true },
    { id: "advanced_reports", label: "Reportes avanzados", description: "Reportes personalizados y exportación", included: true },
    { id: "priority_support", label: "Soporte prioritario", description: "Atención prioritaria vía chat y email", included: true },
    { id: "api_access", label: "Acceso API", description: "API REST para integraciones", included: false },
    { id: "custom_integrations", label: "Integraciones personalizadas", description: "Conexiones con sistemas externos", included: false },
    { id: "white_label", label: "White label", description: "Personalización con marca propia", included: false },
    { id: "dedicated_support", label: "Soporte dedicado", description: "Ejecutivo de cuenta asignado", included: false },
    { id: "sla", label: "SLA garantizado", description: "Acuerdo de nivel de servicio 99.9%", included: false },
  ],
  CORPORATIVO: [
    { id: "basic_inventory", label: "Inventario básico", description: "Gestión de productos y stock", included: true },
    { id: "csv_import", label: "Importación CSV", description: "Importar productos y proveedores vía CSV", included: true },
    { id: "basic_reports", label: "Reportes básicos", description: "Reportes de inventario y movimientos", included: true },
    { id: "email_alerts", label: "Alertas por email", description: "Notificaciones de stock bajo por correo", included: true },
    { id: "multi_user", label: "Usuarios ilimitados", description: "Sin límite de usuarios", included: true },
    { id: "unlimited_bodegas", label: "Bodegas ilimitadas", description: "Sin límite de ubicaciones", included: true },
    { id: "whatsapp_alerts", label: "Alertas por WhatsApp", description: "Notificaciones vía WhatsApp Business", included: true },
    { id: "kardex", label: "Kardex valorizado", description: "Control de inventario valorizado por producto", included: true },
    { id: "conteos", label: "Conteos de inventario", description: "Conteos físicos y conciliación", included: true },
    { id: "barcode", label: "Escaneo de códigos", description: "Escaneo de códigos de barras", included: true },
    { id: "advanced_reports", label: "Reportes avanzados", description: "Reportes personalizados y exportación", included: true },
    { id: "priority_support", label: "Soporte prioritario", description: "Atención prioritaria vía chat y email", included: true },
    { id: "api_access", label: "Acceso API", description: "API REST para integraciones", included: true },
    { id: "custom_integrations", label: "Integraciones personalizadas", description: "Conexiones con sistemas externos", included: true },
    { id: "white_label", label: "White label", description: "Personalización con marca propia", included: true },
    { id: "dedicated_support", label: "Soporte dedicado", description: "Ejecutivo de cuenta asignado", included: true },
    { id: "sla", label: "SLA garantizado", description: "Acuerdo de nivel de servicio 99.9%", included: true },
  ],
};

export const PLAN_LIMITS: Record<
  Plan,
  {
    maxUsers: number;
    maxBodegas: number;
    maxProductos: number;
    maxMovimientos: number;
  }
> = {
  EMPRENDEDOR: {
    maxUsers: 3,
    maxBodegas: 2,
    maxProductos: 500,
    maxMovimientos: 1000,
  },
  NEGOCIO: {
    maxUsers: 10,
    maxBodegas: 10,
    maxProductos: 5000,
    maxMovimientos: Number.POSITIVE_INFINITY,
  },
  CORPORATIVO: {
    maxUsers: Number.POSITIVE_INFINITY,
    maxBodegas: Number.POSITIVE_INFINITY,
    maxProductos: Number.POSITIVE_INFINITY,
    maxMovimientos: Number.POSITIVE_INFINITY,
  },
};

export const PLAN_PRICES: Record<Plan, { monthly: number; yearly: number }> = {
  EMPRENDEDOR: {
    monthly: 149.00,
    yearly: 1490.00,
  },
  NEGOCIO: {
    monthly: 449,
    yearly: 3490.00,
  },
  CORPORATIVO: {
    monthly: 999,
    yearly: 7990.00,
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  EMPRENDEDOR: "Emprendedor",
  NEGOCIO: "Negocio",
  CORPORATIVO: "Corporativo",
};

export const PLAN_DESCRIPTIONS: Record<Plan, string> = {
  EMPRENDEDOR: "Ideal para negocios que están empezando a profesionalizar su inventario.",
  NEGOCIO: "Para empresas medianas que necesitan control avanzado y reportes detallados.",
  CORPORATIVO: "Para empresas grandes que requieren integraciones y soporte dedicado.",
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.EMPRENDEDOR;
}

export function getPlanFeatures(plan: Plan): Feature[] {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.EMPRENDEDOR;
}

export function getPlanPrice(
  plan: Plan,
  interval: "monthly" | "yearly"
): number {
  return PLAN_PRICES[plan]?.[interval] ?? PLAN_PRICES.EMPRENDEDOR[interval];
}

export async function checkLimit({
  tenant,
  resource,
  count,
}: {
  tenant: { plan: Plan };
  resource: "users" | "bodegas" | "productos" | "movimientos";
  count: number;
}): Promise<{ allowed: boolean; limit: number }> {
  const limits = getPlanLimits(tenant.plan);
  const limitMap: Record<typeof resource, number> = {
    users: limits.maxUsers,
    bodegas: limits.maxBodegas,
    productos: limits.maxProductos,
    movimientos: limits.maxMovimientos,
  };
  const limit = limitMap[resource];
  return {
    allowed: count < limit,
    limit,
  };
}

export function hasFeature(plan: Plan, featureId: string): boolean {
  const features = getPlanFeatures(plan);
  return features.some((f) => f.id === featureId && f.included);
}

export function canUpgrade(currentPlan: Plan, targetPlan: Plan): boolean {
  const ranking: Record<Plan, number> = {
    EMPRENDEDOR: 0,
    NEGOCIO: 1,
    CORPORATIVO: 2,
  };
  return ranking[targetPlan] > ranking[currentPlan];
}

export function canDowngrade(currentPlan: Plan, targetPlan: Plan): boolean {
  const ranking: Record<Plan, number> = {
    EMPRENDEDOR: 0,
    NEGOCIO: 1,
    CORPORATIVO: 2,
  };
  return ranking[targetPlan] < ranking[currentPlan];
}
