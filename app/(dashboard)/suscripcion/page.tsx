"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers";
import { toast } from "sonner";
import { getPlanLimits, PLAN_PRICES, PLAN_LABELS } from "@/lib/subscriptions";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  CreditCard, Check, X, ArrowUp, ArrowDown, Crown, Building2,
  Users, Warehouse, Package, FileText, Calendar, AlertTriangle,
  ExternalLink, Loader2, Phone, Mail,
} from "lucide-react";
import type { Plan } from "@prisma/client";

interface FeatureItem {
  label: string;
  included: boolean;
}

interface UsageItem {
  label: string;
  used: number;
  limit: number | "Ilimitado";
  icon: React.ReactNode;
}

interface InvoiceItem {
  id: string;
  date: string;
  amount: number;
  status: string;
  description: string;
}

const planFeatures: Record<Plan, FeatureItem[]> = {
  EMPRENDEDOR: [
    { label: "Hasta 500 productos", included: true },
    { label: "Hasta 3 usuarios", included: true },
    { label: "Hasta 2 bodegas", included: true },
    { label: "Movimientos básicos", included: true },
    { label: "Reportes básicos", included: true },
    { label: "Alertas de stock", included: true },
    { label: "Soporte por email", included: true },
    { label: "API de integración", included: false },
    { label: "Múltiples sucursales", included: false },
    { label: "Reportes avanzados", included: false },
    { label: "Soporte prioritario", included: false },
    { label: "Acceso ilimitado", included: false },
  ],
  NEGOCIO: [
    { label: "Hasta 5,000 productos", included: true },
    { label: "Hasta 10 usuarios", included: true },
    { label: "Hasta 10 bodegas", included: true },
    { label: "Movimientos ilimitados", included: true },
    { label: "Reportes avanzados", included: true },
    { label: "Alertas de stock", included: true },
    { label: "Soporte prioritario", included: true },
    { label: "API de integración", included: true },
    { label: "Múltiples sucursales", included: true },
    { label: "Exportación a Excel/PDF", included: true },
    { label: "Códigos de barras", included: true },
    { label: "Acceso ilimitado", included: false },
  ],
  CORPORATIVO: [
    { label: "Productos ilimitados", included: true },
    { label: "Usuarios ilimitados", included: true },
    { label: "Bodegas ilimitadas", included: true },
    { label: "Movimientos ilimitados", included: true },
    { label: "Reportes personalizados", included: true },
    { label: "Alertas avanzadas", included: true },
    { label: "Soporte 24/7", included: true },
    { label: "API de integración", included: true },
    { label: "Múltiples sucursales", included: true },
    { label: "Exportación avanzada", included: true },
    { label: "Códigos de barras", included: true },
    { label: "Acceso ilimitado", included: true },
  ],
};

export default function SuscripcionPage() {
  const { user, tenant } = useAuth();
  const currentPlan = (tenant?.plan || "EMPRENDEDOR") as Plan;
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [plan, setPlan] = useState<Plan>(currentPlan);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setPlan(currentPlan);
    const prices = PLAN_PRICES[currentPlan];
    setInvoices([
      { id: "inv-001", date: new Date(Date.now() - 86400000 * 5).toISOString(), amount: prices.monthly, status: "paid", description: `Plan ${PLAN_LABELS[currentPlan]} - Mensual` },
      { id: "inv-002", date: new Date(Date.now() - 86400000 * 35).toISOString(), amount: prices.monthly, status: "paid", description: `Plan ${PLAN_LABELS[currentPlan]} - Mensual` },
      { id: "inv-003", date: new Date(Date.now() - 86400000 * 65).toISOString(), amount: prices.monthly, status: "paid", description: `Plan ${PLAN_LABELS[currentPlan]} - Mensual` },
      { id: "inv-004", date: new Date(Date.now() - 86400000 * 95).toISOString(), amount: 149, status: "paid", description: "Plan Emprendedor - Mensual (anterior)" },
    ]);
    setLoading(false);
  }, [currentPlan]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const limits = getPlanLimits(plan);
  const planName = PLAN_LABELS[plan];
  const prices = PLAN_PRICES[plan];

  const usageItems: UsageItem[] = [
    { label: "Usuarios", used: 8, limit: limits.maxUsers, icon: <Users className="h-4 w-4" /> },
    { label: "Bodegas", used: 4, limit: limits.maxBodegas, icon: <Warehouse className="h-4 w-4" /> },
    { label: "Productos", used: 320, limit: limits.maxProductos, icon: <Package className="h-4 w-4" /> },
  ];

  const getUsagePercent = (used: number, limit: number | typeof Infinity) => {
    if (limit === Infinity) return 0;
    return Math.min((used / (limit as number)) * 100, 100);
  };

  const handleChangePlan = async (targetPlan: Plan, billingInterval: "monthly" | "yearly" = "monthly") => {
    if (targetPlan === plan) {
      toast.info("Ya tienes este plan activo.");
      return;
    }

    setCheckoutLoading(targetPlan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan, billingInterval }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear sesión de pago");
      }

      const { data } = await res.json();
      if (data?.url) {
        toast.success(`Redirigiendo a Recurrente para completar el pago del plan ${PLAN_LABELS[targetPlan]}...`);
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de pago");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar el cambio de plan");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleUpgrade = () => {
    if (plan === "CORPORATIVO") {
      toast.info("Ya tienes el plan más alto. Contacta a soporte para personalización.");
      return;
    }
    const nextPlan = plan === "EMPRENDEDOR" ? "NEGOCIO" : "CORPORATIVO";
    handleChangePlan(nextPlan as Plan);
  };

  const handleDowngrade = () => {
    if (plan === "EMPRENDEDOR") {
      toast.info("Ya tienes el plan mínimo.");
      return;
    }
    const prevPlan = plan === "CORPORATIVO" ? "NEGOCIO" : "EMPRENDEDOR";
    handleChangePlan(prevPlan as Plan);
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/suscripcion/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al cancelar");
      }

      toast.success("Suscripción cancelada. Recibirás acceso hasta el final del período.");
      fetchSubscription();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar suscripción");
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="col-span-2 h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Suscripción</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu plan y facturación con Recurrente</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="col-span-2 border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-indigo-500/10 p-2.5">
                  <Crown className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-white">Plan {planName}</CardTitle>
                  <CardDescription>
                    Q{prices.monthly}/mes · Q{prices.yearly}/año
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 text-xs">Activo</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-3">
              {usageItems.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.icon}</span>
                      <span className="text-sm text-white">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.used} / {item.limit === Infinity ? "Ilimitado" : item.limit}
                    </span>
                  </div>
                  <Progress value={getUsagePercent(item.used, item.limit as number)} className="h-1.5" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleUpgrade}
                disabled={plan === "CORPORATIVO" || checkoutLoading !== null}
              >
                {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowUp className="mr-2 h-4 w-4" />}
                Mejorar Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleDowngrade}
                disabled={plan === "EMPRENDEDOR" || checkoutLoading !== null}
              >
                {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                Reducir Plan
              </Button>
            </div>

            <Separator className="my-4 border-white/[0.04]" />

            <div className="grid grid-cols-2 gap-4">
              {planFeatures[plan].map((feature) => (
                <div key={feature.label} className="flex items-center gap-2">
                  {feature.included ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                  )}
                  <span className={cn("text-xs", feature.included ? "text-muted-foreground" : "text-muted-foreground/40")}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardHeader>
            <CardTitle className="text-white">Pagos</CardTitle>
            <CardDescription>Gestionado por Recurrente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <CreditCard className="h-6 w-6 text-muted-foreground" />
                <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">Recurrente</Badge>
              </div>
              <p className="mt-3 text-sm text-white">Método de pago gestionado por Recurrente</p>
              <p className="text-xs text-muted-foreground">Pasarela de pago guatemalteca</p>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleChangePlan(plan)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Gestionar Pagos en Recurrente
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-400 hover:text-red-300"
              onClick={handleCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
              Cancelar Suscripción
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Historial de Facturación</CardTitle>
          <CardDescription>Últimas facturas y pagos procesados por Recurrente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Descripción</th>
                  <th className="pb-3 pr-4 font-medium text-right">Monto</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Factura</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(inv.date)}</td>
                    <td className="py-3 pr-4 text-white">{inv.description}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(inv.amount)}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={inv.status === "paid" ? "success" : "warning"} className="text-[10px]">
                        {inv.status === "paid" ? "Pagado" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => toast.info("Las facturas se gestionan desde el portal de Recurrente")}>
                        <FileText className="mr-1 h-3 w-3" />Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader>
          <CardTitle className="text-white">Soporte de Recurrente</CardTitle>
          <CardDescription>¿Problemas con tu pago o facturación?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://wa.me/50258303182"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <Phone className="h-4 w-4" />
              WhatsApp: 58303182
            </a>
            <a
              href="mailto:totalappgt@gmail.com"
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-400 hover:bg-indigo-500/20 transition-colors"
            >
              <Mail className="h-4 w-4" />
              totalappgt@gmail.com
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Los pagos son procesados de forma segura por Recurrente, la pasarela de pagos guatemalteca.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
