import { PrismaClient, Plan, Rol, TenantStatus, MovimientoTipo, ProductoEstado, UserStatus, AlertaTipo } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = "totalappgt@gmail.com";
const SUPER_ADMIN_PASSWORD = "admintotal";
const SUPER_ADMIN_NOMBRE = "Administrador TotalAppGT";

async function main() {
  console.log("Iniciando seed de InvenPro SaaS...");

  console.log("Limpiando datos existentes...");
  await prisma.alerta.deleteMany();
  await prisma.conteoItem.deleteMany();
  await prisma.conteo.deleteMany();
  await prisma.movimiento.deleteMany();
  await prisma.inventario.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.proveedor.deleteMany();
  await prisma.bodega.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.tenant.deleteMany();

  // 1. Super Admin Tenant
  console.log("Creando tenant Super Admin...");
  const adminTenant = await prisma.tenant.create({
    data: {
      name: "TotalAppGT Admin Central",
      slug: "admin-central",
      plan: Plan.CORPORATIVO,
      status: TenantStatus.ACTIVO,
      config: {
        moneda: "GTQ",
        zonaHoraria: "America/Guatemala",
        impuesto: 12,
        redondeo: 2,
        website: "https://totalappgt.com",
        email: "totalappgt@gmail.com",
      },
    },
  });
  console.log(`  Tenant Admin: ${adminTenant.id}`);

  // 2. Subscription Plans
  console.log("Creando planes de suscripcion...");

  const planEmprendedor = await prisma.subscriptionPlan.create({
    data: {
      name: "EMPRENDEDOR",
      recurrentePlanId: process.env.RECURRENTE_PLAN_EMPRENDEDOR_ID || "plan_emprendedor",
      maxUsers: 3,
      maxBodegas: 2,
      maxProductos: 500,
      maxMovimientos: 1000,
      features: [
        "Dashboard basico",
        "Gestion de inventario",
        "Control de bodegas (2)",
        "Movimientos (entradas/salidas)",
        "Kardex basico",
        "Reportes basicos",
        "Codigo de barras",
        "Soporte por email",
        "Exportar CSV",
      ],
      priceMonthly: 149.00,
      priceYearly: 1490.00,
    },
  });

  const planNegocio = await prisma.subscriptionPlan.create({
    data: {
      name: "NEGOCIO",
      recurrentePlanId: process.env.RECURRENTE_PLAN_NEGOCIO_ID || "plan_negocio",
      maxUsers: 10,
      maxBodegas: 10,
      maxProductos: 999999,
      maxMovimientos: 999999,
      features: [
        "Dashboard avanzado",
        "Gestion de inventario completa",
        "Control de bodegas (10)",
        "Movimientos (entradas/salidas/ajustes/traslados)",
        "Kardex completo con valuacion",
        "Reportes avanzados",
        "Codigo de barras y QR",
        "Ordenes de compra",
        "Alertas (stock bajo, vencimiento)",
        "Conteos de inventario",
        "Multiples usuarios (10)",
        "Importar/Exportar CSV y Excel",
        "Soporte prioritario",
        "API de acceso",
      ],
      priceMonthly: 349.00,
      priceYearly: 3490.00,
    },
  });

  const planCorporativo = await prisma.subscriptionPlan.create({
    data: {
      name: "CORPORATIVO",
      recurrentePlanId: process.env.RECURRENTE_PLAN_CORPORATIVO_ID || "plan_corporativo",
      maxUsers: 999999,
      maxBodegas: 999999,
      maxProductos: 999999,
      maxMovimientos: 999999,
      features: [
        "Dashboard ejecutivo",
        "Gestion de inventario ilimitada",
        "Bodegas ilimitadas",
        "Todos los tipos de movimiento",
        "Kardex completo con valuacion (PEPS/Promedio)",
        "Reportes personalizados",
        "Codigo de barras y QR",
        "Ordenes de compra",
        "Alertas configurables",
        "Conteos de inventario masivos",
        "Usuarios ilimitados",
        "Roles y permisos avanzados",
        "Importar/Exportar CSV y Excel",
        "Soporte VIP (WhatsApp directo)",
        "API de acceso completo",
        "Webhooks personalizados",
        "Personalizacion de marca",
        "Capacitacion incluida",
      ],
      priceMonthly: 799.00,
      priceYearly: 7990.00,
    },
  });
  console.log("  Planes: EMPRENDEDOR, NEGOCIO, CORPORATIVO");

  // 3. Demo Tenant
  console.log("Creando tenant Demo...");
  const trialDate = new Date();
  trialDate.setDate(trialDate.getDate() + 14);

  const demoTenant = await prisma.tenant.create({
    data: {
      name: "Empresa Demo GT",
      slug: "demo",
      plan: Plan.NEGOCIO,
      status: TenantStatus.TRIAL,
      trialEndsAt: trialDate,
      config: {
        moneda: "GTQ",
        zonaHoraria: "America/Guatemala",
        impuesto: 12,
        redondeo: 2,
        direccion: "Zona 10, Ciudad de Guatemala",
        telefono: "58303182",
        email: "demo@invenpro.gt",
      },
    },
  });
  console.log(`  Tenant Demo: ${demoTenant.id}`);

  // 4. Super Admin User
  console.log("Creando usuario Super Admin...");
  const adminPasswordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.create({
    data: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      nombre: SUPER_ADMIN_NOMBRE,
      rol: Rol.ADMIN,
      estado: UserStatus.ACTIVO,
      tenantId: adminTenant.id,
      telefono: "58303182",
    },
  });
  console.log(`  Usuario Admin: ${adminUser.id} (${SUPER_ADMIN_EMAIL})`);

  // 5. Demo User
  console.log("Creando usuario Demo...");
  const demoPasswordHash = await bcrypt.hash("demo1234", 12);
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@invenpro.gt",
      passwordHash: demoPasswordHash,
      nombre: "Usuario Demo",
      rol: Rol.ADMIN,
      estado: UserStatus.ACTIVO,
      tenantId: demoTenant.id,
      telefono: "55550001",
    },
  });
  console.log(`  Usuario Demo: ${demoUser.id} (demo@invenpro.gt)`);

  // 6. Bodegas
  console.log("Creando bodegas demo...");
  const bodegaPrincipal = await prisma.bodega.create({
    data: {
      nombre: "Bodega Principal",
      direccion: "Calzada Roosevelt 22-43, Zona 11, Ciudad de Guatemala",
      telefono: "22330001",
      encargado: "Carlos Lopez",
      activa: true,
      tenantId: demoTenant.id,
    },
  });

  const bodegaTransito = await prisma.bodega.create({
    data: {
      nombre: "Bodega de Transito",
      direccion: "Km 15.5 Carretera a El Salvador, Santa Catarina Pinula",
      telefono: "22330002",
      encargado: "Maria Garcia",
      activa: true,
      tenantId: demoTenant.id,
    },
  });
  console.log(`  Bodegas: ${bodegaPrincipal.id}, ${bodegaTransito.id}`);

  // 7. Categorias
  console.log("Creando categorias demo...");
  const catTecnologia = await prisma.categoria.create({
    data: { nombre: "Tecnologia", descripcion: "Equipos tecnologicos y electronicos", tenantId: demoTenant.id },
  });
  const catOficina = await prisma.categoria.create({
    data: { nombre: "Oficina", descripcion: "Articulos y suministros de oficina", tenantId: demoTenant.id },
  });
  const catMobiliario = await prisma.categoria.create({
    data: { nombre: "Mobiliario", descripcion: "Muebles y mobiliario de oficina", tenantId: demoTenant.id },
  });
  console.log(`  Categorias: ${catTecnologia.id}, ${catOficina.id}, ${catMobiliario.id}`);

  // 8. Proveedor
  console.log("Creando proveedores demo...");
  const proveedorGT = await prisma.proveedor.create({
    data: {
      nombre: "Proveedor General GT",
      nit: "1234567-8",
      direccion: "Diagonal 6, 10-50 Zona 10, Guatemala",
      telefono: "23670000",
      email: "ventas@proveedorgt.com",
      contacto: "Juan Perez",
      tenantId: demoTenant.id,
    },
  });
  console.log(`  Proveedor: ${proveedorGT.id}`);

  // 9. Productos
  console.log("Creando productos demo...");
  const producto1 = await prisma.producto.create({
    data: {
      codigo: "PRD-001",
      nombre: "Laptop HP ProBook",
      descripcion: "Laptop HP ProBook 450 G10, Core i5, 16GB RAM, 512GB SSD",
      categoriaId: catTecnologia.id,
      unidadMedida: "UNIDAD",
      costoUnit: 4500.00,
      precioUnit: 6500.00,
      stockMin: 5,
      stockMax: 50,
      codigoBarras: "740100500001",
      sku: "LAP-HP-PRB-001",
      proveedorId: proveedorGT.id,
      estado: ProductoEstado.ACTIVO,
      tenantId: demoTenant.id,
    },
  });

  const producto2 = await prisma.producto.create({
    data: {
      codigo: "PRD-002",
      nombre: 'Monitor Dell 24"',
      descripcion: "Monitor Dell P2422H, 24 pulgadas, Full HD, IPS, 60Hz",
      categoriaId: catTecnologia.id,
      unidadMedida: "UNIDAD",
      costoUnit: 1200.00,
      precioUnit: 1800.00,
      stockMin: 3,
      stockMax: 30,
      codigoBarras: "740100500002",
      sku: "MON-DELL-24-002",
      proveedorId: proveedorGT.id,
      estado: ProductoEstado.ACTIVO,
      tenantId: demoTenant.id,
    },
  });

  const producto3 = await prisma.producto.create({
    data: {
      codigo: "PRD-003",
      nombre: "Teclado Mecanico RGB",
      descripcion: "Teclado mecanico gamer RGB, switches blue, USB, layout espanol",
      categoriaId: catTecnologia.id,
      unidadMedida: "UNIDAD",
      costoUnit: 250.00,
      precioUnit: 450.00,
      stockMin: 10,
      stockMax: 100,
      codigoBarras: "740100500003",
      sku: "TEC-MEC-RGB-003",
      proveedorId: proveedorGT.id,
      estado: ProductoEstado.ACTIVO,
      tenantId: demoTenant.id,
    },
  });

  const producto4 = await prisma.producto.create({
    data: {
      codigo: "PRD-004",
      nombre: "Resma Papel Bond",
      descripcion: "Resma de papel bond tamano carta, 500 hojas, 75g/m2",
      categoriaId: catOficina.id,
      unidadMedida: "UNIDAD",
      costoUnit: 35.00,
      precioUnit: 55.00,
      stockMin: 20,
      stockMax: 200,
      codigoBarras: "740100500004",
      sku: "PAP-BOND-004",
      proveedorId: proveedorGT.id,
      estado: ProductoEstado.ACTIVO,
      tenantId: demoTenant.id,
    },
  });

  const producto5 = await prisma.producto.create({
    data: {
      codigo: "PRD-005",
      nombre: "Silla Ejecutiva",
      descripcion: "Silla ejecutiva ergonomica, respaldo alto, soporte lumbar, base cromada",
      categoriaId: catMobiliario.id,
      unidadMedida: "UNIDAD",
      costoUnit: 850.00,
      precioUnit: 1500.00,
      stockMin: 2,
      stockMax: 20,
      codigoBarras: "740100500005",
      sku: "SILL-EJE-005",
      proveedorId: proveedorGT.id,
      estado: ProductoEstado.ACTIVO,
      tenantId: demoTenant.id,
    },
  });
  console.log("  Productos: PRD-001, PRD-002, PRD-003, PRD-004, PRD-005");

  // 10. Inventario inicial en Bodega Principal
  console.log("Creando inventario inicial...");
  const inventarios = await Promise.all([
    prisma.inventario.create({
      data: {
        bodegaId: bodegaPrincipal.id,
        productoId: producto1.id,
        cantidad: 15,
        lote: "LOTE-001-2026",
        fechaVencimiento: new Date("2028-06-30"),
      },
    }),
    prisma.inventario.create({
      data: {
        bodegaId: bodegaPrincipal.id,
        productoId: producto2.id,
        cantidad: 10,
        lote: "LOTE-002-2026",
        fechaVencimiento: new Date("2028-06-30"),
      },
    }),
    prisma.inventario.create({
      data: {
        bodegaId: bodegaPrincipal.id,
        productoId: producto3.id,
        cantidad: 25,
        lote: "LOTE-003-2026",
        fechaVencimiento: new Date("2028-06-30"),
      },
    }),
    prisma.inventario.create({
      data: {
        bodegaId: bodegaPrincipal.id,
        productoId: producto4.id,
        cantidad: 50,
        lote: "LOTE-004-2026",
        fechaVencimiento: new Date("2028-06-30"),
      },
    }),
    prisma.inventario.create({
      data: {
        bodegaId: bodegaPrincipal.id,
        productoId: producto5.id,
        cantidad: 8,
        lote: "LOTE-005-2026",
        fechaVencimiento: new Date("2028-06-30"),
      },
    }),
  ]);
  console.log(`  Inventario: ${inventarios.length} registros`);

  // 11. Sample Movements
  console.log("Creando movimientos de ejemplo...");

  const movimientos = await Promise.all([
    prisma.movimiento.create({
      data: {
        tipo: MovimientoTipo.ENTRADA,
        fecha: new Date("2026-08-01T08:00:00Z"),
        cantidad: 10,
        cantAnterior: 0,
        cantNueva: 10,
        costoUnit: 4500.00,
        total: 45000.00,
        bodegaId: bodegaPrincipal.id,
        productoId: producto1.id,
        usuarioId: demoUser.id,
        notas: "Compra inicial - Laptops HP ProBook para ventas",
        referencia: "FACT-A001-2026",
        documento: "FACT-A001-2026",
        tenantId: demoTenant.id,
      },
    }),
    prisma.movimiento.create({
      data: {
        tipo: MovimientoTipo.ENTRADA,
        fecha: new Date("2026-08-01T09:00:00Z"),
        cantidad: 30,
        cantAnterior: 0,
        cantNueva: 30,
        costoUnit: 35.00,
        total: 1050.00,
        bodegaId: bodegaPrincipal.id,
        productoId: producto4.id,
        usuarioId: demoUser.id,
        notas: "Compra de papel bond para oficina",
        referencia: "FACT-A002-2026",
        documento: "FACT-A002-2026",
        tenantId: demoTenant.id,
      },
    }),
    prisma.movimiento.create({
      data: {
        tipo: MovimientoTipo.ENTRADA,
        fecha: new Date("2026-08-02T10:00:00Z"),
        cantidad: 20,
        cantAnterior: 0,
        cantNueva: 20,
        costoUnit: 850.00,
        total: 17000.00,
        bodegaId: bodegaPrincipal.id,
        productoId: producto5.id,
        usuarioId: demoUser.id,
        notas: "Compra de sillas ejecutivas para renovacion",
        referencia: "FACT-A003-2026",
        documento: "FACT-A003-2026",
        tenantId: demoTenant.id,
      },
    }),
    prisma.movimiento.create({
      data: {
        tipo: MovimientoTipo.SALIDA,
        fecha: new Date("2026-08-03T14:00:00Z"),
        cantidad: 2,
        cantAnterior: 10,
        cantNueva: 8,
        costoUnit: 4500.00,
        total: 9000.00,
        bodegaId: bodegaPrincipal.id,
        productoId: producto1.id,
        usuarioId: demoUser.id,
        notas: "Entrega de laptops a departamento de IT",
        referencia: "SAL-001-2026",
        documento: "SAL-001-2026",
        tenantId: demoTenant.id,
      },
    }),
  ]);
  console.log(`  Movimientos: ${movimientos.length} registros`);

  // 12. Sample Alerta
  console.log("Creando alerta de ejemplo...");
  const alerta = await prisma.alerta.create({
    data: {
      tipo: AlertaTipo.STOCK_BAJO,
      mensaje: "Stock bajo: Silla Ejecutiva tiene solo 8 unidades, por debajo del minimo de 2.",
      productoId: producto5.id,
      destinatarios: ["demo@invenpro.gt"],
      canal: ["NOTIFICACION_APP"],
      activa: true,
      tenantId: demoTenant.id,
    },
  });
  console.log(`  Alerta: ${alerta.id}`);

  // Summary
  console.log("");
  console.log("==============================================");
  console.log("  SEED COMPLETADO EXITOSAMENTE");
  console.log("==============================================");
  console.log("  Tenants: 2 (admin-central + demo)");
  console.log("  Planes: 3 (EMPRENDEDOR Q149.00/Q1490.00, NEGOCIO Q449/Q3490.00, CORPORATIVO Q999/Q7990.00)");
  console.log("  Usuarios: 2 (Super Admin + Demo)");
  console.log("  Bodegas: 2 (Principal + Transito)");
  console.log("  Categorias: 3 (Tecnologia, Oficina, Mobiliario)");
  console.log("  Proveedores: 1 (Proveedor General GT)");
  console.log("  Productos: 5 (PRD-001 a PRD-005)");
  console.log("  Inventario: 5 registros");
  console.log("  Movimientos: 4 (3 entradas + 1 salida)");
  console.log("  Alertas: 1 (stock bajo)");
  console.log("");
  console.log("  SUPER ADMIN:");
  console.log(`    Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`    Contrasena: ${SUPER_ADMIN_PASSWORD}`);
  console.log("");
  console.log("  DEMO:");
  console.log("    Email: demo@invenpro.gt");
  console.log("    Contrasena: demo1234");
  console.log("==============================================");
}

main()
  .catch((e) => {
    console.error("Error durante el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
