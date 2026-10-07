"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, CreditCard, DollarSign, AlertTriangle, Wallet } from "lucide-react";

interface CxP {
  id: string; proveedor: { id: string; nombre: string; nit: string | null };
  monto: number; saldo: number; fecha: string; vencimiento: string; estado: string; diasVencido: number;
}
interface Proveedor { id: string; nombre: string; }

const estadoVariant = (e: string) => e === "PAGADA" ? "success" : e === "VENCIDA" ? "destructive" : e === "PARCIAL" ? "warning" : "default";

export default function CxPPage() {
  const [loading, setLoading] = useState(true);
  const [cuentas, setCuentas] = useState<CxP[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [meta, setMeta] = useState({ totalPendiente: 0, vencidas: 0 });
  const [estadoFiltro, setEstadoFiltro] = useState("PENDIENTES");
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [abonarOpen, setAbonarOpen] = useState(false);
  const [selected, setSelected] = useState<CxP | null>(null);
  const [nuevo, setNuevo] = useState({ proveedorId: "", monto: 0, vencimiento: "" });
  const [monto, setMonto] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [c, p] = await Promise.all([api<CxP[]>("/api/cuentas-por-pagar"), api<Proveedor[]>("/api/proveedores?limit=200")]);
    if (c.success) {
      setCuentas(c.data ?? []);
      const m = (c.meta ?? {}) as { totalPendiente?: number; vencidas?: number };
      setMeta({ totalPendiente: m.totalPendiente ?? 0, vencidas: m.vencidas ?? 0 });
    } else toast.error(c.error);
    if (p.success) setProveedores(p.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (estadoFiltro === "TODAS") return cuentas;
    if (estadoFiltro === "PENDIENTES") return cuentas.filter((c) => c.estado !== "PAGADA" && c.estado !== "ANULADA");
    return cuentas.filter((c) => c.estado === estadoFiltro);
  }, [cuentas, estadoFiltro]);

  const crear = async () => {
    if (!nuevo.proveedorId || nuevo.monto <= 0 || !nuevo.vencimiento) { toast.error("Proveedor, monto y vencimiento son obligatorios"); return; }
    setSaving(true);
    const res = await api("/api/cuentas-por-pagar", { method: "POST", body: nuevo });
    setSaving(false);
    if (res.success) { toast.success("Cuenta por pagar registrada"); setNuevaOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const abonar = async () => {
    if (!selected || monto <= 0) { toast.error("Ingresa un monto válido"); return; }
    setSaving(true);
    const res = await api(`/api/cuentas-por-pagar/${selected.id}`, { method: "PATCH", body: { monto } });
    setSaving(false);
    if (res.success) { toast.success(res.message ?? "Pago registrado"); setAbonarOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Cuentas por Pagar</h1>
          <p className="text-sm text-muted-foreground">Cuentas con proveedores y pagos</p>
        </div>
        <Button size="sm" onClick={() => { setNuevo({ proveedorId: proveedores[0]?.id ?? "", monto: 0, vencimiento: "" }); setNuevaOpen(true); }}><Plus className="mr-1 h-4 w-4" />Nueva Cuenta</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Saldo total pendiente", value: formatCurrency(meta.totalPendiente), icon: DollarSign, color: "text-rose-400", bg: "bg-rose-500/10" },
          { label: "Cuentas vencidas", value: meta.vencidas, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Cuentas registradas", value: cuentas.length, icon: Wallet, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDIENTES">Pendientes</SelectItem>
            <SelectItem value="VENCIDA">Vencidas</SelectItem>
            <SelectItem value="PAGADA">Pagadas</SelectItem>
            <SelectItem value="TODAS">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Proveedor</th>
                  <th className="pb-3 pr-4 font-medium">Emisión</th>
                  <th className="pb-3 pr-4 font-medium">Vence</th>
                  <th className="pb-3 pr-4 font-medium text-right">Monto</th>
                  <th className="pb-3 pr-4 font-medium text-right">Saldo</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-white">{c.proveedor?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(c.fecha)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(c.vencimiento)}
                      {c.estado === "VENCIDA" && <span className="ml-1 text-red-400">({c.diasVencido}d)</span>}
                    </td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(c.monto)}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(c.saldo)}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(c.estado) as never} className="text-[10px]">{c.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      {c.estado !== "PAGADA" && c.estado !== "ANULADA" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelected(c); setMonto(c.saldo); setAbonarOpen(true); }}>
                          <CreditCard className="mr-1 h-3.5 w-3.5" />Pagar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay cuentas por pagar</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={nuevaOpen} onOpenChange={setNuevaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Nueva Cuenta por Pagar</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Proveedor</Label>
              <Select value={nuevo.proveedorId} onValueChange={(v) => setNuevo({ ...nuevo, proveedorId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Monto</Label><Input type="number" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label className="text-white">Vencimiento</Label><Input type="date" value={nuevo.vencimiento} onChange={(e) => setNuevo({ ...nuevo, vencimiento: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setNuevaOpen(false)}>Cancelar</Button><Button onClick={crear} loading={saving}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={abonarOpen} onOpenChange={setAbonarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Pagar Cuenta</DialogTitle><DialogDescription>{selected?.proveedor?.nombre} — saldo {formatCurrency(selected?.saldo ?? 0)}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4"><div className="space-y-2"><Label className="text-white">Monto a pagar</Label><Input type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value))} /></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setAbonarOpen(false)}>Cancelar</Button><Button onClick={abonar} loading={saving}>Pagar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
