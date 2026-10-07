"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Package, Check } from "lucide-react";

interface Producto { id: string; codigo: string; nombre: string; precioUnit: number; unidadMedida: string; stockTotal: number; categoria: { nombre: string }; }
interface Bodega { id: string; nombre: string; }
interface Cliente { id: string; nombre: string; nit: string | null; }
interface Caja { id: string; nombre: string; estado: string; }

interface CartLine { productoId: string; codigo: string; nombre: string; precioUnit: number; cantidad: number; descuento: number; stockTotal: number; }

export default function PosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [bodegaId, setBodegaId] = useState("");
  const [clienteId, setClienteId] = useState("none");
  const [cajaId, setCajaId] = useState("none");
  const [tipo, setTipo] = useState<"POS" | "FACTURA" | "CREDITO">("POS");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [descuentoGlobal, setDescuentoGlobal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastTicket, setLastTicket] = useState<{ numero: string; total: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [p, b, c, cj] = await Promise.all([
      api<Producto[]>("/api/productos?limit=200&estado=ACTIVO"),
      api<Bodega[]>("/api/bodegas"),
      api<Cliente[]>("/api/clientes?limit=200"),
      api<Caja[]>("/api/cajas"),
    ]);
    if (p.success) setProductos(p.data ?? []);
    if (b.success) { setBodegas(b.data ?? []); if (b.data?.[0]) setBodegaId(b.data[0].id); }
    if (c.success) setClientes(c.data ?? []);
    if (cj.success) { const abiertas = (cj.data ?? []).filter((x) => x.estado === "ABIERTA"); setCajas(abiertas); if (abiertas[0]) setCajaId(abiertas[0].id); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtrados = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q));
  }, [productos, search]);

  const addToCart = (p: Producto) => {
    setCart((prev) => {
      const existe = prev.find((l) => l.productoId === p.id);
      if (existe) return prev.map((l) => l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      return [...prev, { productoId: p.id, codigo: p.codigo, nombre: p.nombre, precioUnit: Number(p.precioUnit), cantidad: 1, descuento: 0, stockTotal: p.stockTotal }];
    });
  };

  const setQty = (id: string, qty: number) => setCart((prev) => prev.map((l) => l.productoId === id ? { ...l, cantidad: Math.max(1, qty) } : l));
  const setDesc = (id: string, d: number) => setCart((prev) => prev.map((l) => l.productoId === id ? { ...l, descuento: Math.max(0, Math.min(100, d)) } : l));
  const removeLine = (id: string) => setCart((prev) => prev.filter((l) => l.productoId !== id));

  const totales = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.cantidad * l.precioUnit * (1 - l.descuento / 100), 0);
    const desc = Math.min(descuentoGlobal, subtotal);
    const base = subtotal - desc;
    const impuesto = base * 0.12;
    return { subtotal, desc, impuesto, total: base + impuesto };
  }, [cart, descuentoGlobal]);

  const cobrar = async () => {
    if (cart.length === 0) { toast.error("Agrega productos al carrito"); return; }
    if (!bodegaId) { toast.error("Selecciona una bodega"); return; }
    if (tipo === "CREDITO" && clienteId === "none") { toast.error("Una venta a crédito requiere un cliente"); return; }
    setSaving(true);
    const res = await api<{ id: string; numero: string }>("/api/ventas", {
      method: "POST",
      body: {
        tipo,
        bodegaId,
        clienteId: clienteId === "none" ? null : clienteId,
        cajaId: cajaId === "none" ? null : cajaId,
        metodoPago,
        pagoInmediato: tipo !== "CREDITO",
        descuentoGlobal,
        impuestoPct: 12,
        items: cart.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnit: l.precioUnit, descuento: l.descuento })),
      },
    });
    setSaving(false);
    if (res.success) {
      setLastTicket({ numero: res.data?.numero ?? "", total: totales.total });
      toast.success(`Venta ${res.data?.numero} registrada`);
      setCart([]);
      setDescuentoGlobal(0);
      fetchData();
    } else toast.error(res.error);
  };

  if (loading) return <div className="p-6 text-muted-foreground">Cargando punto de venta...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Punto de Venta</h1>
          <p className="text-sm text-muted-foreground">Venta rápida con descuento de inventario automático</p>
        </div>
        {lastTicket && (
          <Badge variant="success" className="gap-1"><Check className="h-3 w-3" />Última: {lastTicket.numero} · {formatCurrency(lastTicket.total)}</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        {/* Catálogo */}
        <Card className="border-white/[0.04] bg-[#0a0a2a]/60">
          <CardContent className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar producto por nombre o código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus />
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
              {filtrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col gap-1 rounded-xl border border-white/[0.06] bg-[#0f0f2e] p-3 text-left transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-400" />
                    <span className="font-mono text-[10px] text-muted-foreground">{p.codigo}</span>
                  </div>
                  <span className="line-clamp-2 min-h-[32px] text-sm font-medium text-white">{p.nombre}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-300">{formatCurrency(p.precioUnit)}</span>
                    <span className={cn("text-[10px]", p.stockTotal > 0 ? "text-emerald-400" : "text-red-400")}>{p.stockTotal} disp.</span>
                  </div>
                </button>
              ))}
              {filtrados.length === 0 && <p className="col-span-full py-10 text-center text-muted-foreground">Sin productos</p>}
            </div>
          </CardContent>
        </Card>

        {/* Carrito */}
        <Card className="flex flex-col border-white/[0.04] bg-[#0a0a2a]/60">
          <CardContent className="flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-white">Carrito</span>
              <Badge variant="default" className="ml-auto">{cart.length} items</Badge>
            </div>

            <div className="mb-3 space-y-2">
              <Select value={bodegaId} onValueChange={setBodegaId}>
                <SelectTrigger><SelectValue placeholder="Bodega" /></SelectTrigger>
                <SelectContent>{bodegas.map((b) => <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-2">
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Consumidor final</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={cajaId} onValueChange={setCajaId}>
                  <SelectTrigger><SelectValue placeholder="Caja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin caja</SelectItem>
                    {cajas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="max-h-[36vh] flex-1 space-y-2 overflow-y-auto">
              {cart.map((l) => (
                <div key={l.productoId} className="rounded-lg border border-white/[0.06] bg-[#0f0f2e] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{l.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{formatCurrency(l.precioUnit)} c/u</p>
                    </div>
                    <button onClick={() => removeLine(l.productoId)} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(l.productoId, l.cantidad - 1)}><Minus className="h-3 w-3" /></Button>
                    <Input className="h-7 w-14 text-center" type="number" value={l.cantidad} onChange={(e) => setQty(l.productoId, Number(e.target.value))} />
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(l.productoId, l.cantidad + 1)}><Plus className="h-3 w-3" /></Button>
                    <Input className="h-7 w-14 text-center text-xs" type="number" value={l.descuento} onChange={(e) => setDesc(l.productoId, Number(e.target.value))} title="% desc." />
                    <span className="ml-auto text-sm font-semibold text-white">{formatCurrency(l.cantidad * l.precioUnit * (1 - l.descuento / 100))}</span>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Haz clic en los productos para agregarlos</p>}
            </div>

            <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Descuento global (Q)</Label>
                <Input className="ml-auto h-8 w-24" type="number" value={descuentoGlobal} onChange={(e) => setDescuentoGlobal(Number(e.target.value))} />
              </div>
              <div className="space-y-1 text-sm">
                <Row label="Subtotal" value={formatCurrency(totales.subtotal)} />
                <Row label="Descuento" value={`- ${formatCurrency(totales.desc)}`} />
                <Row label="IVA (12%)" value={formatCurrency(totales.impuesto)} />
                <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-lg font-bold text-white">
                  <span>Total</span><span>{formatCurrency(totales.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {(["POS", "FACTURA", "CREDITO"] as const).map((t) => (
                  <button key={t} onClick={() => setTipo(t)} className={cn("flex-1 rounded-lg px-2 py-1.5 text-xs font-medium", tipo === t ? "bg-indigo-500/20 text-indigo-300" : "bg-white/[0.03] text-muted-foreground")}>
                    {t === "POS" ? "Contado" : t === "FACTURA" ? "Factura" : "Crédito"}
                  </button>
                ))}
              </div>

              {tipo !== "CREDITO" && (
                <div className="flex gap-2">
                  <Button variant={metodoPago === "EFECTIVO" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMetodoPago("EFECTIVO")}><Banknote className="mr-1 h-3.5 w-3.5" />Efectivo</Button>
                  <Button variant={metodoPago === "TARJETA" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMetodoPago("TARJETA")}><CreditCard className="mr-1 h-3.5 w-3.5" />Tarjeta</Button>
                  <Button variant={metodoPago === "TRANSFERENCIA" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setMetodoPago("TRANSFERENCIA")}>Transf.</Button>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={cobrar} loading={saving} disabled={cart.length === 0}>
                Cobrar {formatCurrency(totales.total)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-muted-foreground"><span>{label}</span><span>{value}</span></div>;
}
