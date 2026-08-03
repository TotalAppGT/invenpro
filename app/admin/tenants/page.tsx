"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Filter,
  ChevronDown,
  Building,
  Eye,
  CreditCard,
  Shield,
  Users,
  UserX,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  usersCount: number;
  createdAt: string;
  ultimoAcceso: string | null;
}

const planLabels: Record<string, string> = {
  EMPRENDEDOR: "Emprendedor",
  NEGOCIO: "Negocio",
  CORPORATIVO: "Corporativo",
};

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  ACTIVO: "success",
  TRIAL: "warning",
  SUSPENDIDO: "default",
  CANCELADO: "destructive",
};

const statusLabels: Record<string, string> = {
  ACTIVO: "Activo",
  TRIAL: "Trial",
  SUSPENDIDO: "Suspendido",
  CANCELADO: "Cancelado",
};

export default function AdminTenantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("TODOS");
  const [filterStatus, setFilterStatus] = useState<string>("TODOS");
  const [sortKey, setSortKey] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const mockTenants: TenantRow[] = [
      { id: "1", name: "Distribuidora El Sol", slug: "distribuidora-el-sol", plan: "NEGOCIO", status: "ACTIVO", usersCount: 8, createdAt: new Date("2025-01-15").toISOString(), ultimoAcceso: new Date().toISOString() },
      { id: "2", name: "Ferretería Central", slug: "ferreteria-central", plan: "EMPRENDEDOR", status: "ACTIVO", usersCount: 3, createdAt: new Date("2025-03-22").toISOString(), ultimoAcceso: new Date(Date.now() - 86400000).toISOString() },
      { id: "3", name: "Farmacias Unidas", slug: "farmacias-unidas", plan: "CORPORATIVO", status: "ACTIVO", usersCount: 25, createdAt: new Date("2024-11-01").toISOString(), ultimoAcceso: new Date().toISOString() },
      { id: "4", name: "TechStore GT", slug: "techstore-gt", plan: "NEGOCIO", status: "TRIAL", usersCount: 5, createdAt: new Date("2026-07-15").toISOString(), ultimoAcceso: new Date(Date.now() - 3600000).toISOString() },
      { id: "5", name: "Alimentos del Valle", slug: "alimentos-del-valle", plan: "NEGOCIO", status: "ACTIVO", usersCount: 12, createdAt: new Date("2025-06-10").toISOString(), ultimoAcceso: new Date().toISOString() },
      { id: "6", name: "Ropa y Moda SA", slug: "ropa-y-moda-sa", plan: "EMPRENDEDOR", status: "SUSPENDIDO", usersCount: 2, createdAt: new Date("2025-09-03").toISOString(), ultimoAcceso: null },
      { id: "7", name: "ElectroHogar", slug: "electrohogar", plan: "NEGOCIO", status: "ACTIVO", usersCount: 9, createdAt: new Date("2025-04-18").toISOString(), ultimoAcceso: new Date(Date.now() - 7200000).toISOString() },
      { id: "8", name: "Papelería El Lápiz", slug: "papeleria-el-lapiz", plan: "EMPRENDEDOR", status: "CANCELADO", usersCount: 1, createdAt: new Date("2025-02-28").toISOString(), ultimoAcceso: null },
      { id: "9", name: "ConstruMax", slug: "construmax", plan: "CORPORATIVO", status: "ACTIVO", usersCount: 45, createdAt: new Date("2024-08-05").toISOString(), ultimoAcceso: new Date().toISOString() },
      { id: "10", name: "Autopartes GT", slug: "autopartes-gt", plan: "EMPRENDEDOR", status: "TRIAL", usersCount: 2, createdAt: new Date("2026-07-28").toISOString(), ultimoAcceso: new Date(Date.now() - 86400000).toISOString() },
      { id: "11", name: "MegaMarket", slug: "megamarket", plan: "CORPORATIVO", status: "ACTIVO", usersCount: 60, createdAt: new Date("2024-06-12").toISOString(), ultimoAcceso: new Date().toISOString() },
      { id: "12", name: "Librería Universal", slug: "libreria-universal", plan: "EMPRENDEDOR", status: "TRIAL", usersCount: 1, createdAt: new Date("2026-08-01").toISOString(), ultimoAcceso: new Date().toISOString() },
    ];
    setTenants(mockTenants);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = useMemo(() => {
    let result = [...tenants];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q));
    }
    if (filterPlan !== "TODOS") {
      result = result.filter((t) => t.plan === filterPlan);
    }
    if (filterStatus !== "TODOS") {
      result = result.filter((t) => t.status === filterStatus);
    }
    result.sort((a, b) => {
      const aVal = a[sortKey as keyof TenantRow] ?? "";
      const bVal = b[sortKey as keyof TenantRow] ?? "";
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [tenants, search, filterPlan, filterStatus, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((t) => t.status === "ACTIVO").length,
    trial: tenants.filter((t) => t.status === "TRIAL").length,
    suspended: tenants.filter((t) => t.status === "SUSPENDIDO").length,
  }), [tenants]);

  const handleChangePlan = (tenant: TenantRow, newPlan: string) => {
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, plan: newPlan } : t)));
    toast.success(`Plan de ${tenant.name} cambiado a ${planLabels[newPlan]}`);
  };

  const handleToggleStatus = (tenant: TenantRow) => {
    const newStatus = tenant.status === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO";
    setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
    toast.success(`${tenant.name} ${newStatus === "ACTIVO" ? "activado" : "suspendido"}`);
  };

  const handleImpersonate = (tenant: TenantRow) => {
    toast.info(`Accediendo como admin de ${tenant.name}...`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Gestión de Tenants</h1>
        <p className="text-sm text-muted-foreground">Administrar todas las empresas del sistema</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total", value: stats.total, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Activos", value: stats.active, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Trial", value: stats.trial, icon: Shield, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Suspendidos", value: stats.suspended, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODOS">Todos los planes</option>
              <option value="EMPRENDEDOR">Emprendedor</option>
              <option value="NEGOCIO">Negocio</option>
              <option value="CORPORATIVO">Corporativo</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activo</option>
              <option value="TRIAL">Trial</option>
              <option value="SUSPENDIDO">Suspendido</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-white" onClick={() => handleSort("name")}>
                    Nombre {sortKey === "name" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                  </th>
                  <th className="pb-3 pr-4 font-medium">Slug</th>
                  <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-white" onClick={() => handleSort("plan")}>
                    Plan {sortKey === "plan" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                  </th>
                  <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-white" onClick={() => handleSort("status")}>
                    Estado {sortKey === "status" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                  </th>
                  <th className="pb-3 pr-4 font-medium">Usuarios</th>
                  <th className="cursor-pointer pb-3 pr-4 font-medium hover:text-white" onClick={() => handleSort("createdAt")}>
                    Fecha Creación {sortKey === "createdAt" && (sortDir === "asc" ? "\u2191" : "\u2193")}
                  </th>
                  <th className="pb-3 pr-4 font-medium">Última Actividad</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-medium text-white">{tenant.name}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{tenant.slug}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="default" className="bg-indigo-500/10 text-indigo-400 text-[10px]">
                        {planLabels[tenant.plan]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant[tenant.status] || "default"} className="text-[10px]">
                        {statusLabels[tenant.status]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{tenant.usersCount}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {tenant.ultimoAcceso ? formatDate(tenant.ultimoAcceso) : "Nunca"}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${tenant.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver detalle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleChangePlan(tenant, "EMPRENDEDOR")}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Plan Emprendedor
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangePlan(tenant, "NEGOCIO")}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Plan Negocio
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangePlan(tenant, "CORPORATIVO")}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Plan Corporativo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(tenant)}>
                            {tenant.status === "ACTIVO" ? (
                              <>
                                <UserX className="mr-2 h-4 w-4 text-red-400" />
                                <span className="text-red-400">Suspender</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4 text-emerald-400" />
                                <span className="text-emerald-400">Activar</span>
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${tenant.id}/usuarios`)}>
                            <Users className="mr-2 h-4 w-4" />
                            Ver usuarios
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleImpersonate(tenant)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Acceder como
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No se encontraron tenants con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Mostrando {filteredTenants.length} de {tenants.length} tenants
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
