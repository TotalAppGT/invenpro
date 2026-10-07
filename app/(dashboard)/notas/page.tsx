"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Nota {
  id: string; numero: string; tipo: string; motivo: string; monto: number; fecha: string;
  cliente: { id: string; nombre: string } | null;
  venta: { id: string; numero: string } | null;
  usuario: { nombre: string } | null;
}
interface Cliente { id: string; nombre: string; }

export default function NotasPage() {
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tipo: "CREDITO", motivo: "", monto: 0, clienteId: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [n, c] = await Promise.all([api<Nota[]>("/api/notas?limit=100"), api<Cliente[]>("/api/clientes?limit=200")]);
    if (n.success) setNotas(n.data ?? []); else toast.error(n.error);
    if (c.success) setClientes(c.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const guardar = async () => {
    if (!form.motivo || form.monto <= 0) { toast.error("Motivo y monto son obligatorios"); return; }
    setSaving(true);
    const res = await api("/api/notas", { method: "POST", body: { tipo: form.tipo, motivo: form.motivo, monto: Number(form.monto), clienteId: form.clienteId || null } });
    setSaving(false);
    if (res.success) { toast.success("Nota registrada"); setDialogOpen(false); fetchData(); }
    else toast.error(res.error);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Notas de Crédito / Débito</h1>
          <p className="text-sm text-muted-foreground">Ajustes de saldo a clientes y ventas</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ tipo: "CREDITO", motivo: "", monto: 0, clienteId: clientes[0]?.id ?? "" }); setDialogOpen(true); }}><Plus className="mr-1 h-4 w-4" />Nueva Nota</Button>
      </div>

      <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04] text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Número</th>
                  <th className="pb-3 pr-4 font-medium">Tipo</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Motivo</th>
                  <th className="pb-3 pr-4 font-medium text-right">Monto</th>
                  <th className="pb-3 pr-4 font-medium">Venta</th>
                  <th className="pb-3 pr-4 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {notas.map((n) => (
                  <tr key={n.id} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 font-mono text-xs text-indigo-300">{n.numero}</td>
                    <td className="py-3 pr-4"><Badge variant={n.tipo === "CREDITO" ? "success" : "warning"} className="text-[10px]">{n.tipo}</Badge></td>
                    <td className="py-3 pr-4 text-white">{n.cliente?.nombre ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{n.motivo}</td>
                    <td className="py-3 pr-4 text-right font-medium text-white">{formatCurrency(n.monto)}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{n.venta?.numero ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(n.fecha)}</td>
                  </tr>
                ))}
                {notas.length === 0 && (<tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No hay notas registradas</td></tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Nueva Nota</DialogTitle><DialogDescription>Crédito reduce el saldo del cliente; débito lo aumenta</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CREDITO">Crédito</SelectItem><SelectItem value="DEBITO">Débito</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Cliente</Label>
              <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white">Monto</Label><Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label className="text-white">Motivo *</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Devolución, ajuste, error..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={guardar} loading={saving}>Registrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
