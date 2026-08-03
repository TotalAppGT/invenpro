"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDateTime, cn } from "@/lib/utils";
import {
  Search,
  Download,
  FileText,
  Filter,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";

interface AuditLog {
  id: string;
  fecha: string;
  tenant: string;
  usuario: string;
  accion: string;
  entidad: string;
  detalles: string;
  ip: string;
}

const accionVariant: Record<string, "default" | "success" | "warning" | "destructive"> = {
  CREATE: "success",
  UPDATE: "default",
  DELETE: "destructive",
  LOGIN: "default",
  LOGOUT: "default",
  EXPORT: "warning",
  IMPERSONATE: "destructive",
  PLAN_CHANGE: "warning",
  SUSPEND: "destructive",
  ACTIVATE: "success",
};

export default function AdminAuditoriaPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [filterTenant, setFilterTenant] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterAction, setFilterAction] = useState("TODAS");
  const [filterEntity, setFilterEntity] = useState("TODAS");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const mockLogs: AuditLog[] = Array.from({ length: 75 }, (_, i) => {
      const tenants = ["Distribuidora El Sol", "Ferretería Central", "Farmacias Unidas", "TechStore GT", "ConstruMax", "Alimentos del Valle"];
      const users = ["admin@empresa.com", "operador@empresa.com", "supervisor@empresa.com", "juan.perez@correo.com"];
      const acciones = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "IMPERSONATE", "PLAN_CHANGE", "SUSPEND", "ACTIVATE"];
      const entidades = ["producto", "movimiento", "bodega", "usuario", "tenant", "inventario", "reporte", "suscripcion"];
      const accion = acciones[i % acciones.length];
      const entidad = entidades[i % entidades.length];
      const tenant = i < 10 ? "SUPER_ADMIN" : tenants[i % tenants.length];
      return {
        id: `log-${i + 1}`,
        fecha: new Date(Date.now() - i * 3600000 * (i % 24 + 1)).toISOString(),
        tenant,
        usuario: users[i % users.length],
        accion,
        entidad,
        detalles: `${accion} en ${entidad} ID: ${entidad.slice(0, 4).toUpperCase()}-${String(i + 1000).padStart(4, "0")}`,
        ip: `192.168.${(i % 255)}.${(i * 7) % 255}`,
      };
    });
    setLogs(mockLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.tenant.toLowerCase().includes(q) ||
          l.usuario.toLowerCase().includes(q) ||
          l.detalles.toLowerCase().includes(q) ||
          l.entidad.toLowerCase().includes(q)
      );
    }
    if (filterTenant) {
      result = result.filter((l) => l.tenant.toLowerCase().includes(filterTenant.toLowerCase()));
    }
    if (filterUser) {
      result = result.filter((l) => l.usuario.toLowerCase().includes(filterUser.toLowerCase()));
    }
    if (filterAction !== "TODAS") {
      result = result.filter((l) => l.accion === filterAction);
    }
    if (filterEntity !== "TODAS") {
      result = result.filter((l) => l.entidad === filterEntity);
    }
    if (dateFrom) {
      result = result.filter((l) => new Date(l.fecha) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((l) => new Date(l.fecha) <= new Date(dateTo + "T23:59:59"));
    }
    return result;
  }, [logs, search, filterTenant, filterUser, filterAction, filterEntity, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / perPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);

  const uniqueEntities = useMemo(() => [...new Set(logs.map((l) => l.entidad))].sort(), [logs]);

  const handleExportCSV = () => {
    toast.success("Exportando auditoría a CSV...");
    const headers = "Fecha/Hora,Tenant,Usuario,Acción,Entidad,Detalles,IP";
    const rows = filteredLogs.map(
      (l) => `"${formatDateTime(l.fecha)}","${l.tenant}","${l.usuario}","${l.accion}","${l.entidad}","${l.detalles}","${l.ip}"`
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    toast.success("Exportando auditoría a Excel...");
  };

  const clearFilters = () => {
    setSearch("");
    setFilterTenant("");
    setFilterUser("");
    setFilterAction("TODAS");
    setFilterEntity("TODAS");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters =
    search || filterTenant || filterUser || filterAction !== "TODAS" || filterEntity !== "TODAS" || dateFrom || dateTo;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Auditoría del Sistema</h1>
          <p className="text-sm text-muted-foreground">Registro global de todas las acciones en el sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileText className="mr-1 h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por keyword..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Filtrar tenant..."
              value={filterTenant}
              onChange={(e) => { setFilterTenant(e.target.value); setPage(1); }}
              className="w-40"
            />
            <Input
              placeholder="Filtrar usuario..."
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
              className="w-40"
            />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODAS">Todas las acciones</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="EXPORT">EXPORT</option>
              <option value="IMPERSONATE">IMPERSONATE</option>
              <option value="PLAN_CHANGE">PLAN_CHANGE</option>
              <option value="SUSPEND">SUSPEND</option>
              <option value="ACTIVATE">ACTIVATE</option>
            </select>
            <select
              value={filterEntity}
              onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
              className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODAS">Todas las entidades</option>
              {uniqueEntities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-36 text-xs"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-36 text-xs"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Fecha/Hora</th>
                  <th className="pb-3 pr-4 font-medium">Tenant</th>
                  <th className="pb-3 pr-4 font-medium">Usuario</th>
                  <th className="pb-3 pr-4 font-medium">Acción</th>
                  <th className="pb-3 pr-4 font-medium">Entidad</th>
                  <th className="pb-3 pr-4 font-medium">Detalles</th>
                  <th className="pb-3 pr-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDateTime(log.fecha)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        {log.tenant === "SUPER_ADMIN" ? (
                          <Badge className="bg-red-500/10 text-red-400 text-[10px]">Sistema</Badge>
                        ) : (
                          <span className="text-white">{log.tenant}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{log.usuario}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={accionVariant[log.accion] || "default"} className="text-[10px]">
                        {log.accion}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-400">{log.entidad}</td>
                    <td className="py-3 pr-4 max-w-[250px] truncate text-muted-foreground">{log.detalles}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{log.ip}</td>
                  </tr>
                ))}
                {paginatedLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No se encontraron registros de auditoría con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredLogs.length)} de{" "}
                {filteredLogs.length} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
