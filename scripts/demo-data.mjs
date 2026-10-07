// Creador de datos demo por API. Uso:
//   node scripts/demo-data.mjs
// Variables:
//   BASE_URL  (por defecto http://localhost:3000)
//   DEMO_EMAIL / DEMO_PASSWORD (super admin)

const BASE = process.env.BASE_URL || process.argv[2] || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "totalappgt@gmail.com";
const PASSWORD = process.env.DEMO_PASSWORD || "admintotal";

let cookie = "";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* noop */ }
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${json?.error || ""}`);
  return json;
}

async function login() {
  const res = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")];
  cookie = sc.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) throw new Error("No se pudo iniciar sesión (revisa DEMO_EMAIL/DEMO_PASSWORD)");
  console.log("login OK");
}

async function main() {
  await login();

  const prods = await req("/api/productos?limit=1");
  if ((prods.meta?.total ?? 0) > 0) {
    console.log(`Ya hay ${prods.meta.total} productos. Abortando para no duplicar.`);
    return;
  }

  console.log("== Proveedores ==");
  const provIds = {};
  for (const p of [
    { nombre: "Distribuidora El Sol", email: "ventas@elsol.gt" },
    { nombre: "Importadora Tech", email: "info@importech.gt" },
    { nombre: "FerreMax SA", email: "pedro@ferremax.gt" },
  ]) {
    const r = await req("/api/proveedores", { method: "POST", body: { ...p, direccion: "Ciudad de Guatemala", telefono: "5555-0000", contacto: "Encargado de ventas", notas: "Proveedor demo" } });
    provIds[p.nombre] = r.data.id;
  }

  console.log("== Bodegas ==");
  const bodIds = {};
  for (const b of [
    { nombre: "Bodega Central", encargado: "Juan Perez" },
    { nombre: "Bodega Norte", encargado: "Maria Garcia" },
  ]) {
    const r = await req("/api/bodegas", { method: "POST", body: { ...b, direccion: "Guatemala, Zona 1", telefono: "5555-1111", activa: true } });
    bodIds[b.nombre] = r.data.id;
  }

  console.log("== Ubicaciones ==");
  for (const bn of Object.keys(bodIds)) {
    for (const cod of ["A-01-01", "A-01-02", "B-02-01"]) {
      await req("/api/ubicaciones", { method: "POST", body: { codigo: `${bn.slice(8, 10)}-${cod}`, nombre: `Rack ${cod}`, tipo: "POSICION", pasillo: "A", rack: "01", nivel: "1", posicion: cod, capacidad: 200, activa: true, bodegaId: bodIds[bn] } });
    }
  }

  console.log("== Listas de precio ==");
  for (const l of [
    { nombre: "Precio Base", tipo: "BASE", moneda: "Q", margen: 0, esDefecto: true, activa: true },
    { nombre: "Mayoreo", tipo: "MAYOREO", moneda: "Q", margen: 12, activa: true },
    { nombre: "Menudeo", tipo: "MENUDEO", moneda: "Q", margen: 35, activa: true },
  ]) await req("/api/listas-precio", { method: "POST", body: l });

  console.log("== Categorías ==");
  const catIds = {};
  for (const c of ["Ferretería", "Electrónicos", "Papelería", "Limpieza"]) {
    const r = await req("/api/categorias", { method: "POST", body: { nombre: c, descripcion: "Categoría demo" } });
    catIds[c] = r.data.id;
  }

  console.log("== Productos ==");
  const productos = [
    { codigo: "FER-001", nombre: 'Tornillo autorroscante 3/4"', cat: "Ferretería", costo: 1.25, precio: 2.5, min: 100, max: 2000, reorden: 250, seg: 60, lead: 5, abc: "B", prov: "Distribuidora El Sol" },
    { codigo: "FER-002", nombre: "Cemento Portland 50kg", cat: "Ferretería", costo: 48, precio: 65, min: 50, max: 500, reorden: 120, seg: 30, lead: 10, abc: "A", prov: "Distribuidora El Sol" },
    { codigo: "FER-003", nombre: "Martillo 16oz", cat: "Ferretería", costo: 38, precio: 65, min: 40, max: 300, reorden: 60, seg: 15, lead: 12, abc: "C", prov: "FerreMax SA" },
    { codigo: "FER-004", nombre: "Destornillador estrella", cat: "Ferretería", costo: 15, precio: 28, min: 30, max: 400, reorden: 80, seg: 20, lead: 8, abc: "C", prov: "FerreMax SA" },
    { codigo: "ELE-001", nombre: "Cable HDMI 2m", cat: "Electrónicos", costo: 35, precio: 75, min: 20, max: 200, reorden: 40, seg: 10, lead: 15, abc: "A", prov: "Importadora Tech", series: true },
    { codigo: "ELE-002", nombre: "Mouse inalambrico", cat: "Electrónicos", costo: 55, precio: 110, min: 15, max: 150, reorden: 30, seg: 8, lead: 15, abc: "B", prov: "Importadora Tech", series: true },
    { codigo: "PAP-001", nombre: "Papel bond A4 resma", cat: "Papelería", costo: 42, precio: 58, min: 40, max: 600, reorden: 100, seg: 25, lead: 7, abc: "A", prov: "Distribuidora El Sol" },
    { codigo: "PAP-002", nombre: "Lapicero tinta negra", cat: "Papelería", costo: 1.1, precio: 3, min: 100, max: 3000, reorden: 400, seg: 100, lead: 7, abc: "C", prov: "Distribuidora El Sol" },
    { codigo: "LIM-001", nombre: "Cloro 1 galon", cat: "Limpieza", costo: 18, precio: 32, min: 30, max: 400, reorden: 80, seg: 20, lead: 6, abc: "B", prov: "Distribuidora El Sol", lotes: true },
    { codigo: "LIM-002", nombre: "Jabon liquido 1L", cat: "Limpieza", costo: 22, precio: 38, min: 25, max: 300, reorden: 70, seg: 18, lead: 6, abc: "C", prov: "Distribuidora El Sol", lotes: true },
  ];
  const prodIds = {};
  for (const p of productos) {
    const r = await req("/api/productos", { method: "POST", body: {
      codigo: p.codigo, nombre: p.nombre, descripcion: `${p.nombre} - producto demo`,
      categoriaId: catIds[p.cat], unidadMedida: "UNIDAD", costoUnit: p.costo, precioUnit: p.precio,
      stockMin: p.min, stockMax: p.max, puntoReorden: p.reorden, stockSeguridad: p.seg,
      leadTimeDias: p.lead, clasificacion: p.abc, costoFlete: 0, costoImportacion: 0,
      permiteLotes: !!p.lotes, permiteSeries: !!p.series, proveedorId: provIds[p.prov], estado: "ACTIVO",
    } });
    prodIds[p.codigo] = r.data.id;
  }

  console.log("== Movimientos ==");
  const central = bodIds["Bodega Central"];
  const norte = bodIds["Bodega Norte"];
  for (const e of [
    ["FER-001", central, 800], ["FER-001", norte, 300], ["FER-002", central, 200], ["FER-003", central, 30],
    ["FER-004", central, 250], ["ELE-001", central, 60], ["ELE-002", central, 25], ["PAP-001", central, 300],
    ["PAP-002", central, 1500], ["LIM-001", central, 120], ["LIM-002", central, 40],
  ]) {
    await req("/api/movimientos", { method: "POST", body: { tipo: "ENTRADA", productoId: prodIds[e[0]], bodegaId: e[1], cantidad: e[2], notas: "Carga inicial demo", documento: "OC-DEMO-001" } });
  }
  for (const s of [["FER-001", 320], ["FER-002", 85], ["ELE-001", 28], ["PAP-001", 130], ["PAP-002", 640], ["LIM-001", 55]]) {
    await req("/api/movimientos", { method: "POST", body: { tipo: "SALIDA", productoId: prodIds[s[0]], bodegaId: central, cantidad: s[1], notas: "Consumo demo" } });
  }
  await req("/api/movimientos", { method: "POST", body: { tipo: "TRASLADO", productoId: prodIds["FER-001"], bodegaId: central, bodegaDestinoId: norte, cantidad: 100, notas: "Reabasto norte" } });
  await req("/api/inventario/ajuste", { method: "POST", body: { productoId: prodIds["PAP-002"], bodegaId: central, cantidad: 900, costoUnit: 1.1, motivo: "Ajuste conteo demo" } });

  console.log("== Clientes ==");
  const clienteIds = [];
  for (const c of [
    { nombre: "Ferreteria Los Amigos", nit: "C/F", dias: 0, lim: 0 },
    { nombre: "Constructora Vega", nit: "1234567-8", dias: 30, lim: 25000 },
    { nombre: "Oficinas Delta", nit: "2345678-9", dias: 15, lim: 8000 },
  ]) {
    const r = await req("/api/clientes", { method: "POST", body: { nombre: c.nombre, nit: c.nit, direccion: "Guatemala", telefono: "5555-2222", email: "cliente@demo.gt", contacto: "Compras", limiteCredito: c.lim, diasCredito: c.dias, activo: true } });
    clienteIds.push(r.data.id);
  }

  console.log("== Números de serie ==");
  for (const sn of ["SN-HDMI-0001", "SN-HDMI-0002", "SN-HDMI-0003", "SN-MOUSE-0001", "SN-MOUSE-0002"]) {
    const prod = sn.includes("HDMI") ? "ELE-001" : "ELE-002";
    await req("/api/numeros-serie", { method: "POST", body: { serie: sn, productoId: prodIds[prod], bodegaId: central, estado: "DISPONIBLE", costoUnit: 0 } });
  }

  console.log("== Ventas demo ==");
  // Venta de contado
  await req("/api/ventas", { method: "POST", body: {
    tipo: "POS", bodegaId: central, clienteId: clienteIds[0], metodoPago: "EFECTIVO", pagoInmediato: true, impuestoPct: 12,
    items: [{ productoId: prodIds["FER-002"], cantidad: 10, precioUnit: 65 }, { productoId: prodIds["PAP-001"], cantidad: 5, precioUnit: 58 }],
  } });
  // Venta a crédito (genera CxC)
  await req("/api/ventas", { method: "POST", body: {
    tipo: "CREDITO", bodegaId: central, clienteId: clienteIds[1], impuestoPct: 12,
    items: [{ productoId: prodIds["ELE-001"], cantidad: 4, precioUnit: 75 }, { productoId: prodIds["LIM-001"], cantidad: 6, precioUnit: 32 }],
  } });

  console.log("== Cotización demo ==");
  await req("/api/cotizaciones", { method: "POST", body: {
    clienteId: clienteIds[2], impuestoPct: 12, notas: "Cotización demo",
    items: [{ productoId: prodIds["FER-001"], cantidad: 100, precioUnit: 2.5 }, { productoId: prodIds["PAP-002"], cantidad: 50, precioUnit: 3 }],
  } });

  console.log("== Cuenta por pagar demo ==");
  await req("/api/cuentas-por-pagar", { method: "POST", body: { proveedorId: provIds["Distribuidora El Sol"], monto: 5000, vencimiento: new Date(Date.now() + 30 * 86400000).toISOString() } });

  console.log("== Alertas ==");
  for (const a of [["STOCK_BAJO", "Martillo 16oz por debajo del punto de reorden", "FER-003"], ["STOCK_BAJO", "Mouse inalambrico con stock critico", "ELE-002"]]) {
    await req("/api/alertas", { method: "POST", body: { tipo: a[0], mensaje: a[1], productoId: prodIds[a[2]], destinatarios: [EMAIL], canal: ["NOTIFICACION_APP"], activa: true } });
  }

  const dash = await req("/api/dashboard");
  console.log("LISTO. Dashboard:", JSON.stringify(dash.data?.stats));
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
