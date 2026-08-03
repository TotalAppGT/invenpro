"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  PieChart,
  Activity,
  Database,
  Mail,
  HardDrive,
  ArrowRight,
  BarChart3,
  Settings,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  monthlyRevenue: number;
  totalUsers: number;
}

interface RevenueData {
  month: string;
  revenue: number;
}

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  createdAt: string;
  usersCount: number;
}

interface PlanDistribution {
  name: string;
  value: number;
}

const COLORS = ["#818cf8", "#34d399", "#fbbf24", "#f87171", "#a78bfa"];

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  ACTIVO: "success",
  TRIAL: "warning",
  SUSPENDIDO: "default",
  CANCELADO: "destructive",
};

const planLabels: Record<string, string> = {
  EMPRENDEDOR: "Emprendedor",
  NEGOCIO: "Negocio",
  CORPORATIVO: "Corporativo",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [recentTenants, setRecentTenants] = useState<TenantSummary[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [systemHealth, setSystemHealth] = useState({ db: true, email: true, storage: 34 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const mockStats: GlobalStats = {
        totalTenants: 48,
        activeTenants: 35,
        trialTenants: 8,
        monthlyRevenue: 28500,
        totalUsers: 312,
      };
      setStats(mockStats);

      const mockRevenue: RevenueData[] = [
        { month: "Ene", revenue: 22000 },
        { month: "Feb", revenue: 23500 },
        { month: "Mar", revenue: 24800 },
        { month: "Abr", revenue: 26100 },
        { month: "May", revenue: 25800 },
        { month: "Jun", revenue: 27200 },
        { month: "Jul", revenue: 28500 },
        { month: "Ago", revenue: 29100 },
        { month: "Sep", revenue: 30500 },
        { month: "Oct", revenue: 31200 },
        { month: "Nov", revenue: 29800 },
        { month: "Dic", revenue: 32000 },
      ];
      setRevenueData(mockRevenue);

      setRecentTenants([
        { id: "1", name: "Distribuidora El Sol", slug: "distribuidora-el-sol", plan: "NEGOCIO", status: "ACTIVO", createdAt: new Date().toISOString(), usersCount: 8 },
        { id: "2", name: "Ferretería Central", slug: "ferreteria-central", plan: "EMPRENDEDOR", status: "ACTIVO", createdAt: new Date(Date.now() - 86400000).toISOString(), usersCount: 3 },
        { id: "3", name: "Farmacias Unidas", slug: "farmacias-unidas", plan: "CORPORATIVO", status: "ACTIVO", createdAt: new Date(Date.now() - 172800000).toISOString(), usersCount: 25 },
        { id: "4", name: "TechStore GT", slug: "techstore-gt", plan: "NEGOCIO", status: "TRIAL", createdAt: new Date(Date.now() - 259200000).toISOString(), usersCount: 5 },
        { id: "5", name: "Alimentos del Valle", slug: "alimentos-del-valle", plan: "NEGOCIO", status: "ACTIVO", createdAt: new Date(Date.now() - 345600000).toISOString(), usersCount: 12 },
        { id: "6", name: "Ropa y Moda SA", slug: "ropa-y-moda-sa", plan: "EMPRENDEDOR", status: "SUSPENDIDO", createdAt: new Date(Date.now() - 432000000).toISOString(), usersCount: 2 },
        { id: "7", name: "ElectroHogar", slug: "electrohogar", plan: "NEGOCIO", status: "ACTIVO", createdAt: new Date(Date.now() - 518400000).toISOString(), usersCount: 9 },
        { id: "8", name: "Papelería El Lápiz", slug: "papeleria-el-lapiz", plan: "EMPRENDEDOR", status: "CANCELADO", createdAt: new Date(Date.now() - 604800000).toISOString(), usersCount: 1 },
        { id: "9", name: "ConstruMax", slug: "construmax", plan: "CORPORATIVO", status: "ACTIVO", createdAt: new Date(Date.now() - 691200000).toISOString(), usersCount: 45 },
        { id: "10", name: "Autopartes GT", slug: "autopartes-gt", plan: "EMPRENDEDOR", status: "TRIAL", createdAt: new Date(Date.now() - 777600000).toISOString(), usersCount: 2 },
      ]);

      setPlanDistribution([
        { name: "Emprendedor", value: 20 },
        { name: "Negocio", value: 18 },
        { name: "Corporativo", value: 5 },
        { name: "Trial", value: 5 },
      ]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statCards = [
    { label: "Total Tenants", value: stats.totalTenants, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Activos", value: stats.activeTenants, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "En Trial", value: stats.trialTenants, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Ingresos Mensuales", value: stats.monthlyRevenue, format: true, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Total Usuarios", value: stats.totalUsers, icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="col-span-2 h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard General</h1>
          <p className="text-sm text-muted-foreground">Vista global del sistema InvenPro SaaS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/tenants")}>
            Ver todos los tenants
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push("/admin/reportes")}>
            Ver reportes
            <BarChart3 className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("rounded-lg p-2.5", card.bg)}>
                    <card.icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-white">
                    {card.format ? formatCurrency(card.value as number) : card.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="col-span-2 border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Proyección de Ingresos Mensuales</CardTitle>
            <CardDescription>Ingresos por suscripciones Q/mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3f" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `Q${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a2a",
                    border: "1px solid #1e1e3f",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#818cf8" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Tenants por Plan</CardTitle>
            <CardDescription>Distribución de planes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RePieChart>
                <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {planDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0a0a2a",
                    border: "1px solid #1e1e3f",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Tenants Recientes</CardTitle>
          <CardDescription>Últimos 10 tenants registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Nombre</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 font-medium">Usuarios</th>
                  <th className="pb-3 pr-4 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white">{tenant.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{planLabels[tenant.plan] || tenant.plan}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant[tenant.status] || "default"} className="text-[10px]">
                        {tenant.status === "ACTIVO" ? "Activo" : tenant.status === "TRIAL" ? "Trial" : tenant.status === "SUSPENDIDO" ? "Suspendido" : "Cancelado"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{tenant.usersCount}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg p-2", systemHealth.db ? "bg-emerald-500/10" : "bg-red-500/10")}>
              <Database className={cn("h-5 w-5", systemHealth.db ? "text-emerald-400" : "text-red-400")} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Base de Datos</p>
              <p className="text-xs text-muted-foreground">{systemHealth.db ? "Operativa" : "Error"}</p>
            </div>
            <div className="ml-auto">
              <div className={cn("h-2 w-2 rounded-full", systemHealth.db ? "bg-emerald-400" : "bg-red-400")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg p-2", systemHealth.email ? "bg-emerald-500/10" : "bg-red-500/10")}>
              <Mail className={cn("h-5 w-5", systemHealth.email ? "text-emerald-400" : "text-red-400")} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Servicio de Email</p>
              <p className="text-xs text-muted-foreground">{systemHealth.email ? "Operativo" : "Error"}</p>
            </div>
            <div className="ml-auto">
              <div className={cn("h-2 w-2 rounded-full", systemHealth.email ? "bg-emerald-400" : "bg-red-400")} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#0a0a2a]/60 backdrop-blur-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <HardDrive className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Almacenamiento</p>
              <p className="text-xs text-muted-foreground">{systemHealth.storage}% usado</p>
            </div>
            <div className="ml-auto h-2 w-16 rounded-full bg-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${systemHealth.storage}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full bg-amber-400"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin/configuracion")}>
          <Settings className="mr-1 h-3.5 w-3.5" />
          Configuración del Sistema
        </Button>
      </div>
    </div>
  );
}
