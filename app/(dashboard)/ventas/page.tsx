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
import { Search, Eye, Ban, CreditCard, Receipt, DollarSign, AlertTriangle } from "lucide-react";

interface Venta {
  id: string; numero: string; tipo: string; estado: string;
  cliente: { id: string; nombre: string } | null;
  usuario: { id: string; nombre: string } | null;
  fecha: string; subtotal: number; descuento: number; impuesto: number;
  total: number; pagado: number; saldo: number; itemsCount: number;
}
interface VentaDetalle extends Venta {
  items: { id: string; cantidad: number; precioUnit: number; subtotal: number; producto: { codigo: string; nombre: string } }[];
  pagos: { id: string; monto: number; metodo: string; fecha: string }[];
}

const estadoVariant = (e: string) => e === "CONFIRMADA" ? "success" : e === "ANULADA" ? "destructive" : "warning";

export default function VentasPage() {
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [detalle, setDetalle] = useState<VentaDetalle | null>(null);
  const [pagarOpen, setPagarOpen] = useState(false);
  const [pagoMonto, setPagoMonto] = useState(0);
  const [pagoMetodo, setPagoMetodo] = useState("EFECTIVO");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await api<Venta[]>("/api/ventas?limit=100");
    if (res.success) setVentas(res.data ?? []); else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ventas.filter((v) => {
      const mQ = !q || v.numero.toLowerCase().includes(q) || (v.cliente?.nombre ?? "").toLowerCase().includes(q);
      const mE = estadoFiltro === "TODOS" || v.estado === estadoFiltro;
      return mQ && mE;
    });
  }, [ventas, search, estadoFiltro]);

  const stats = useMemo(() => ({
    total: ventas.length,
    ventas: ventas.filter((v) => v.estado === "CONFIRMADA").reduce((s, v) => s + v.total, 0),
    porCobrar: ventas.reduce((s, v) => s + v.saldo, 0),
  }), [ventas]);

  const verDetalle = async (id: string) => {
    const res = await api<VentaDetalle>(`/api/ventas/${id}`);
    if (res.success) setDetalle(res.data ?? null);
    else toast.error(res.error);
  };

  const anular = async (v: Venta) => {
    if (!confirm(`¿Anular la venta ${v.numero}? Se devolverá el stock.`)) return;
    const res = await api(`/api/ventas/${v.id}`, { method: "PATCH", body: { accion: "ANULAR" } });
    if (res.success) { toast.success(res.message ?? "Venta anulada"); setDetalle(null); fetchData(); }
    else toast.error(res.error);
  };

  const registrarPago = async () => {
    if (!detalle || pagoMonto <= 0) { toast.error("Ingresa un monto válido"); return; }
    setSaving(true);
    const res = await api(`/api/ventas/${detalle.id}/pagar`, { method: "POST", body: { monto: pagoMonto, metodo: pagoMetodo } });
    setSaving(false);
    if (res.success) { toast.success(res.message ?? "Pago registrado"); setPagarOpen(false); setDetalle(null); fetchData(); }
    else toast.error(res.error);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ventas</h1>
          <p className="text-sm text-muted-foreground">Historial de ventas, cobros y anulaciones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Ventas registradas", value: stats.total, icon: Receipt, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Total vendido", value: formatCurrency(stats.ventas), icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Por cobrar", value: formatCurrency(stats.porCobrar), icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s) => (
          <Card key={s.label} className="border-white/[0.04] bg-[#0a0a2a]/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("rounded-lg p-2", s.bg)}><s.icon className={cn("h-5 w-5", s.color)} /></div>
              <div><p className="text-xl font-bold text-white">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos los estados</SelectItem>
            <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
            <SelectItem value="ANULADA">Anuladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Número</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total</th>
                  <th className="pb-3 pr-4 font-medium text-right">Pagado</th>
                  <th className="pb-3 pr-4 font-medium text-right">Saldo</th>
                  <th className="pb-3 pr-4 font-medium">Estado</th>
                  <th className="pb-3 pr-4 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{v.numero}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(v.fecha)}</td>
                    <td className="py-3 pr-4 text-white">{v.cliente?.nombre ?? "Consumidor final"}</td>
                    <td className="py-3 pr-4"><Badge variant="default" className="text-[10px]">{v.tipo}</Badge></td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(v.total)}</td>
                    <td className="py-3 pr-4 text-right text-emerald-400">{formatCurrency(v.pagado)}</td>
                    <td className="py-3 pr-4 text-right text-amber-400">{formatCurrency(v.saldo)}</td>
                    <td className="py-3 pr-4"><Badge variant={estadoVariant(v.estado) as never} className="text-[10px]">{v.estado}</Badge></td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => verDetalle(v.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        {v.estado === "CONFIRMADA" && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => anular(v)}><Ban className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (<tr><td colSpan={9} className="py-12 text-center text-muted-foreground">No hay ventas registradas</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Venta {detalle?.numero}</DialogTitle>
            <DialogDescription>{detalle?.cliente?.nombre ?? "Consumidor final"} · {detalle ? formatDate(detalle.fecha) : ""}</DialogDescription>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4 py-2">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Producto</th>
                      <th className="pb-2 pr-3 font-medium text-right">Cant.</th>
                      <th className="pb-2 pr-3 font-medium text-right">Precio</th>
                      <th className="pb-2 font-medium text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.items.map((i) => (
                      <tr key={i.id} className="border-b border-white/[0.02]">
                        <td className="py-2 pr-3 text-white">{i.producto?.nombre}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{i.cantidad}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{formatCurrency(i.precioUnit)}</td>
                        <td className="py-2 text-right text-white">{formatCurrency(i.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(detalle.subtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Descuento</span><span>- {formatCurrency(detalle.descuento)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>IVA</span><span>{formatCurrency(detalle.impuesto)}</span></div>
                <div className="flex justify-between font-bold text-white"><span>Total</span><span>{formatCurrency(detalle.total)}</span></div>
                <div className="flex justify-between text-emerald-400"><span>Pagado</span><span>{formatCurrency(detalle.pagado)}</span></div>
                <div className="flex justify-between text-amber-400"><span>Saldo</span><span>{formatCurrency(detalle.saldo)}</span></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
            {detalle && detalle.saldo > 0 && detalle.estado === "CONFIRMADA" && (
              <Button onClick={() => { setPagoMonto(detalle.saldo); setPagarOpen(true); }}><CreditCard className="mr-1 h-4 w-4" />Registrar Pago</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pagarOpen} onOpenChange={setPagarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Registrar Pago</DialogTitle><DialogDescription>Abono a la venta {detalle?.numero}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label className="text-white">Monto</Label><Input type="number" value={pagoMonto} onChange={(e) => setPagoMonto(Number(e.target.value))} /></div>
            <div className="space-y-2">
              <Label className="text-white">Método</Label>
              <Select value={pagoMetodo} onValueChange={setPagoMetodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CHEQUE"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPagarOpen(false)}>Cancelar</Button><Button onClick={registrarPago} loading={saving}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
