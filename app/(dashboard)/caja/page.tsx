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
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Plus, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Wallet, Eye } from "lucide-react";

interface Caja {
  id: string; nombre: string; estado: string; usuario: { nombre: string };
  montoInicial: number; montoFinal: number | null; diferencia: number | null; esperado: number;
  movimientosCount: number; apertura: string; cierre: string | null;
}
interface CajaDetalle extends Caja {
  ingresos: number; egresos: number;
  movimientos: { id: string; tipo: string; monto: number; concepto: string; fecha: string }[];
}

const estadoVariant = (e: string) => e === "ABIERTA" ? "success" : "default";

export default function CajaPage() {
  const [loading, setLoading] = useState(true);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [detalle, setDetalle] = useState<CajaDetalle | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [nueva, setNueva] = useState({ nombre: "Caja Principal", montoInicial: 0 });
  const [mov, setMov] = useState({ tipo: "INGRESO", monto: 0, concepto: "" });
  const [montoFinal, setMontoFinal] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api<Caja[]>("/api/cajas");
    if (res.success) setCajas(res.data ?? []); else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const abiertas = cajas.filter((c) => c.estado === "ABIERTA");
    return { abiertas: abiertas.length, enCaja: abiertas.reduce((s, c) => s + c.esperado, 0) };
  }, [cajas]);

  const abrirCaja = async () => {
    if (!nueva.nombre) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const res = await api("/api/cajas", { method: "POST", body: { nombre: nueva.nombre, montoInicial: Number(nueva.montoInicial) } });
    setSaving(false);
    if (res.success) { toast.success("Caja abierta"); setAbrirOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  const verDetalle = async (id: string) => {
    const res = await api<CajaDetalle>(`/api/cajas/${id}`);
    if (res.success) { setDetalle(res.data ?? null); setDetalleOpen(true); }
    else toast.error(res.error);
  };

  const registrarMov = async () => {
    if (!detalle || mov.monto <= 0 || !mov.concepto) { toast.error("Monto y concepto son obligatorios"); return; }
    setSaving(true);
    const res = await api(`/api/cajas/${detalle.id}/movimientos`, { method: "POST", body: { ...mov, monto: Number(mov.monto) } });
    setSaving(false);
    if (res.success) { toast.success("Movimiento registrado"); setMovOpen(false); verDetalle(detalle.id); fetchData(); }
    else toast.error(res.error);
  };

  const cerrarCaja = async () => {
    if (!detalle) return;
    setSaving(true);
    const res = await api(`/api/cajas/${detalle.id}`, { method: "PATCH", body: { montoFinal: Number(montoFinal) } });
    setSaving(false);
    if (res.success) { toast.success(res.message ?? "Caja cerrada"); setCerrarOpen(false); setDetalleOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Caja</h1>
          <p className="text-sm text-muted-foreground">Apertura, movimientos y cierre de caja</p>
        </div>
        <Button size="sm" onClick={() => { setNueva({ nombre: `Caja ${new Date().toLocaleDateString("es-GT")}`, montoInicial: 0 }); setAbrirOpen(true); }}><Plus className="mr-1 h-4 w-4" />Abrir Caja</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Cajas abiertas", value: stats.abiertas, icon: Unlock, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Efectivo en cajas", value: formatCurrency(stats.enCaja), icon: Wallet, color: "text-indigo-400", bg: "bg-indigo-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Caja</th>
                  <th className="pb-3 pr-4 font-medium">Usuario</th>
                  <th className="pb-3 pr-4 font-medium">Apertura</th>
                  <th className="pb-3 pr-4 font-medium text-right">Inicial</th>
                  <th className="pb-3 pr-4 font-medium text-right">Esperado</th>
                  <th className="pb-3 pr-4 font-medium text-right">Contado</th>
                  <th className="pb-3 pr-4 font-medium text-right">Diferencia</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map((c) => (
                  <tr key={c.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-white">{c.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{c.usuario?.nombre}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(c.apertura)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{formatCurrency(c.montoInicial)}</td>
                    <td className="py-3 pr-4 text-right text-white">{formatCurrency(c.esperado)}</td>
                    <td className="py-3 pr-4 text-right text-muted-foreground">{c.montoFinal !== null ? formatCurrency(c.montoFinal) : "—"}</td>
                    <td className={cn("py-3 pr-4 text-right", c.diferencia === null ? "text-muted-foreground" : c.diferencia === 0 ? "text-emerald-400" : "text-red-400")}>
                      {c.diferencia !== null ? formatCurrency(c.diferencia) : "—"}
                    </td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(c.estado) as never} className="text-[10px]">{c.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => verDetalle(c.id)}><Eye className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {cajas.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No hay cajas registradas</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={abrirOpen} onOpenChange={setAbrirOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Abrir Caja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-white">Nombre</Label><Input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-white">Monto inicial (Q)</Label><Input type="number" value={nueva.montoInicial} onChange={(e) => setNueva({ ...nueva, montoInicial: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbrirOpen(false)}>Cancelar</Button><Button onClick={abrirCaja} loading={saving}>Abrir</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-white">{detalle?.nombre}</DialogTitle><DialogDescription>Esperado en caja: {formatCurrency(detalle?.esperado ?? 0)}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/[0.02] p-3"><p className="text-[10px] text-muted-foreground">Ingresos</p><p className="text-sm font-bold text-emerald-400">{formatCurrency(detalle?.ingresos ?? 0)}</p></div>
              <div className="rounded-lg bg-white/[0.02] p-3"><p className="text-[10px] text-muted-foreground">Egresos</p><p className="text-sm font-bold text-red-400">{formatCurrency(detalle?.egresos ?? 0)}</p></div>
              <div className="rounded-lg bg-white/[0.02] p-3"><p className="text-[10px] text-muted-foreground">Esperado</p><p className="text-sm font-bold text-white">{formatCurrency(detalle?.esperado ?? 0)}</p></div>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {detalle?.movimientos.map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2 text-xs">
                  {["INGRESO", "VENTA", "APERTURA"].includes(m.tipo) ? <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" /> : <ArrowDownCircle className="h-3.5 w-3.5 text-red-400" />}
                  <span className="text-white">{m.concepto}</span>
                  <span className="ml-auto font-medium text-white">{formatCurrency(m.monto)}</span>
                  <span className="text-muted-foreground">{formatDateTime(m.fecha)}</span>
                </div>
              ))}
              {(!detalle || detalle.movimientos.length === 0) && <p className="py-6 text-center text-xs text-muted-foreground">Sin movimientos</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetalleOpen(false)}>Cerrar</Button>
            {detalle?.estado === "ABIERTA" && (
              <>
                <Button variant="outline" onClick={() => { setMov({ tipo: "INGRESO", monto: 0, concepto: "" }); setMovOpen(true); }}>Movimiento</Button>
                <Button onClick={() => { setMontoFinal(detalle.esperado); setCerrarOpen(true); }}><Lock className="mr-1 h-4 w-4" />Cerrar Caja</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Movimiento de Caja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Tipo</Label>
              <Select value={mov.tipo} onValueChange={(v) => setMov({ ...mov, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INGRESO">Ingreso</SelectItem>
                  <SelectItem value="EGRESO">Egreso</SelectItem>
                  <SelectItem value="RETIRO">Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Monto</Label><Input type="number" value={mov.monto} onChange={(e) => setMov({ ...mov, monto: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label className="text-white">Concepto</Label><Input value={mov.concepto} onChange={(e) => setMov({ ...mov, concepto: e.target.value })} placeholder="Descripción" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMovOpen(false)}>Cancelar</Button><Button onClick={registrarMov} loading={saving}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cerrarOpen} onOpenChange={setCerrarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Cerrar Caja</DialogTitle><DialogDescription>Esperado: {formatCurrency(detalle?.esperado ?? 0)}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-white">Efectivo contado (Q)</Label><Input type="number" value={montoFinal} onChange={(e) => setMontoFinal(Number(e.target.value))} /></div>
            <div className="rounded-lg bg-white/[0.02] p-3 text-xs text-muted-foreground">
              Diferencia: <span className={cn("font-semibold", (montoFinal - (detalle?.esperado ?? 0)) === 0 ? "text-emerald-400" : "text-red-400")}>{formatCurrency(montoFinal - (detalle?.esperado ?? 0))}</span>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCerrarOpen(false)}>Cancelar</Button><Button onClick={cerrarCaja} loading={saving}>Cerrar Caja</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
