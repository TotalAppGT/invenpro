import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "El correo es obligatorio")
      .email("Correo electrónico inválido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "La contraseña debe contener mayúsculas, minúsculas y números"
      ),
    confirmPassword: z.string(),
    nombre: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres"),
    empresa: z
      .string()
      .optional(),
    telefono: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const tenantSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .max(60, "El slug no puede exceder 60 caracteres")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "El slug solo puede contener letras minúsculas, números y guiones"
    ),
  plan: z.enum(["EMPRENDEDOR", "NEGOCIO", "CORPORATIVO"]),
  config: z.record(z.unknown()).optional(),
});

export const bodegaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  direccion: z.string().max(200, "La dirección no puede exceder 200 caracteres").optional().nullable(),
  telefono: z.string().max(20, "El teléfono no puede exceder 20 caracteres").optional().nullable(),
  encargado: z.string().max(100, "El nombre del encargado no puede exceder 100 caracteres").optional().nullable(),
  activa: z.boolean().optional(),
});

export const categoriaSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre no puede exceder 80 caracteres"),
  descripcion: z.string().max(300).optional().nullable(),
});

const nitRegex = /^(\d{6,9}(-\d{1})?|C\/F|CF)$/;

export const proveedorSchema = z.object({
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  nit: z
    .string()
    .max(20)
    .regex(nitRegex, "NIT inválido para Guatemala")
    .optional()
    .nullable(),
  direccion: z.string().max(200).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  contacto: z.string().max(100).optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
});

export const productoSchema = z.object({
  codigo: z
    .string()
    .min(1, "El código es obligatorio")
    .max(50, "El código no puede exceder 50 caracteres"),
  nombre: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(150, "El nombre no puede exceder 150 caracteres"),
  descripcion: z.string().max(500).optional().nullable(),
  categoriaId: z.string().min(1, "La categoría es obligatoria"),
  unidadMedida: z.string().min(1).max(20).default("UNIDAD"),
  costoUnit: z
    .number()
    .min(0, "El costo no puede ser negativo")
    .multipleOf(0.0001)
    .optional()
    .default(0),
  precioUnit: z
    .number()
    .min(0, "El precio no puede ser negativo")
    .multipleOf(0.0001)
    .optional()
    .default(0),
  stockMin: z.number().int().min(0).optional().default(0),
  stockMax: z.number().int().min(0).optional().default(0),
  codigoBarras: z.string().max(50).optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  imagen: z.string().optional().nullable(),
  proveedorId: z.string().optional().nullable(),
  permiteLotes: z.boolean().optional().default(false),
  permiteSeries: z.boolean().optional().default(false),
  puntoReorden: z.number().int().min(0).optional().default(0),
  stockSeguridad: z.number().int().min(0).optional().default(0),
  leadTimeDias: z.number().int().min(0).optional().default(0),
  clasificacion: z.enum(["A", "B", "C"]).optional().nullable(),
  costoEstandar: z.number().min(0).optional().nullable(),
  costoFlete: z.number().min(0).optional().default(0),
  costoImportacion: z.number().min(0).optional().default(0),
  estado: z
    .enum(["ACTIVO", "INACTIVO", "DESCONTINUADO"])
    .optional()
    .default("ACTIVO"),
});

export const movimientosSchema = z
  .object({
    tipo: z.enum([
      "ENTRADA",
      "SALIDA",
      "AJUSTE",
      "TRASLADO",
      "CONTEO_DIFERENCIA",
    ]),
    fecha: z.date().optional().default(() => new Date()),
    cantidad: z
      .number()
      .int("La cantidad debe ser un número entero")
      .min(1, "La cantidad debe ser mayor a 0"),
    costoUnit: z.number().min(0).optional().nullable(),
    total: z.number().optional().nullable(),
    bodegaId: z.string().min(1, "La bodega es obligatoria"),
    bodegaDestinoId: z.string().optional().nullable(),
    productoId: z.string().min(1, "El producto es obligatorio"),
    usuarioId: z.string().min(1, "El usuario es obligatorio"),
    notas: z.string().max(500).optional().nullable(),
    referencia: z.string().max(100).optional().nullable(),
    documento: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.tipo === "TRASLADO" && !data.bodegaDestinoId) {
        return false;
      }
      return true;
    },
    {
      message: "La bodega de destino es obligatoria para traslados",
      path: ["bodegaDestinoId"],
    }
  )
  .refine(
    (data) => {
      if (data.tipo === "TRASLADO" && data.bodegaId === data.bodegaDestinoId) {
        return false;
      }
      return true;
    },
    {
      message: "La bodega de destino debe ser diferente a la de origen",
      path: ["bodegaDestinoId"],
    }
  );

export const usuarioSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido"),
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100),
  rol: z.enum(["ADMIN", "SUPERVISOR", "OPERADOR", "CONSULTOR"]).default("OPERADOR"),
  estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO"),
  telefono: z.string().max(20).optional().nullable(),
  foto: z.string().optional().nullable(),
});

export const conteoSchema = z.object({
  bodegaId: z.string().min(1, "La bodega es obligatoria"),
  usuarioId: z.string().min(1, "El usuario es obligatorio"),
  notas: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidadSistema: z.number().int().min(0),
        cantidadFisica: z.number().int().min(0),
        notas: z.string().max(300).optional().nullable(),
      })
    )
    .min(1, "Debe incluir al menos un producto en el conteo"),
});

export const conteoItemSchema = z.object({
  conteoId: z.string().min(1),
  productoId: z.string().min(1),
  cantidadSistema: z.number().int().min(0),
  cantidadFisica: z.number().int().min(0),
  diferencia: z.number().int(),
  notas: z.string().max(300).optional().nullable(),
});

export const alertaSchema = z.object({
  tipo: z.enum(["STOCK_BAJO", "VENCIMIENTO", "MOVIMIENTO", "PERSONALIZADA"]),
  mensaje: z.string().min(1, "El mensaje es obligatorio").max(500),
  productoId: z.string().optional().nullable(),
  destinatarios: z
    .array(z.string().email("Correo inválido en destinatarios"))
    .min(1, "Debe incluir al menos un destinatario"),
  canal: z
    .array(z.enum(["EMAIL", "WHATSAPP", "NOTIFICACION_APP"]))
    .min(1, "Debe seleccionar al menos un canal"),
  programacion: z.string().optional().nullable(),
  activa: z.boolean().optional().default(true),
});

export const importCSVSchema = z.object({
  type: z.enum(["productos", "proveedores", "inventario"]),
  file: z.unknown(),
  bodegaId: z.string().optional(),
  updateExisting: z.boolean().optional().default(false),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(100),
  rol: z.enum(["ADMIN", "SUPERVISOR", "OPERADOR", "CONSULTOR"]),
  telefono: z.string().optional(),
});

export const userUpdateSchema = z.object({
  nombre: z.string().min(2).max(100).optional(),
  rol: z.enum(["ADMIN", "SUPERVISOR", "OPERADOR", "CONSULTOR"]).optional(),
  estado: z.enum(["ACTIVO", "INACTIVO"]).optional(),
  telefono: z.string().max(20).optional().nullable(),
  foto: z.string().optional().nullable(),
});

export const passwordResetSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es obligatoria"),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "La contraseña debe contener mayúsculas, minúsculas y números"
      ),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmNewPassword"],
  });

export const reportSchema = z.object({
  tipo: z.enum(["kardex", "movimientos", "inventario", "stock_bajo", "vencimientos", "ventas"]),
  fechaInicio: z.date(),
  fechaFin: z.date(),
  bodegaId: z.string().optional(),
  categoriaId: z.string().optional(),
  productoId: z.string().optional(),
  formato: z.enum(["pdf", "csv", "excel"]).default("pdf"),
});

export const searchSchema = z.object({
  q: z.string().min(1, "Ingrese un término de búsqueda"),
  type: z
    .enum(["productos", "movimientos", "proveedores", "bodegas", "usuarios"])
    .optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

// ==========================================================================
// NÚCLEO DE INVENTARIO PRO
// ==========================================================================

export const ubicacionSchema = z.object({
  codigo: z.string().min(1, "El código es obligatorio").max(50),
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  tipo: z.enum(["ZONA", "PASILLO", "RACK", "ESTANTE", "NIVEL", "POSICION", "PISO"]).default("POSICION"),
  pasillo: z.string().max(50).optional().nullable(),
  rack: z.string().max(50).optional().nullable(),
  nivel: z.string().max(50).optional().nullable(),
  posicion: z.string().max(50).optional().nullable(),
  capacidad: z.number().int().min(0).optional().default(0),
  activa: z.boolean().optional().default(true),
  bodegaId: z.string().min(1, "La bodega es obligatoria"),
});

export const productoUnidadSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(60),
  abreviatura: z.string().min(1, "La abreviatura es obligatoria").max(15),
  factor: z.number().positive("El factor debe ser mayor a 0"),
  codigoBarras: z.string().max(60).optional().nullable(),
  esBase: z.boolean().optional().default(false),
});

export const productoUnidadesSchema = z.object({
  unidades: z.array(productoUnidadSchema).min(1, "Debe incluir al menos una unidad"),
});

export const listaPrecioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(100),
  tipo: z.enum(["BASE", "MAYOREO", "MENUDEO", "CLIENTE", "ESPECIAL"]).default("BASE"),
  moneda: z.string().max(5).default("GTQ"),
  margen: z.number().min(0).optional().default(0),
  esDefecto: z.boolean().optional().default(false),
  activa: z.boolean().optional().default(true),
});

export const productoPreciosSchema = z.object({
  precios: z.array(
    z.object({
      listaPrecioId: z.string().min(1),
      precio: z.number().min(0),
      descuentoMax: z.number().min(0).max(100).optional().default(0),
    })
  ),
});

export const numeroSerieSchema = z.object({
  serie: z.string().min(1, "El número de serie es obligatorio").max(100),
  productoId: z.string().min(1),
  bodegaId: z.string().min(1),
  ubicacionId: z.string().optional().nullable(),
  lote: z.string().max(60).optional().nullable(),
  estado: z.enum(["DISPONIBLE", "RESERVADO", "VENDIDO", "BAJA"]).optional().default("DISPONIBLE"),
  costoUnit: z.number().min(0).optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  notas: z.string().max(300).optional().nullable(),
});

export const devolucionSchema = z.object({
  tipo: z.enum(["CLIENTE", "PROVEEDOR"]),
  motivo: z.string().min(1, "El motivo es obligatorio").max(300),
  observacion: z.string().max(500).optional().nullable(),
  bodegaId: z.string().min(1, "La bodega es obligatoria"),
  clienteId: z.string().optional().nullable(),
  proveedorId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidad: z.number().int().min(1),
        costoUnit: z.number().min(0).optional().default(0),
        precioUnit: z.number().min(0).optional().default(0),
        lote: z.string().max(60).optional().nullable(),
        reingresa: z.boolean().optional().default(true),
      })
    )
    .min(1, "Debe incluir al menos un item"),
});

export const ajusteSchema = z.object({
  motivo: z.string().min(1, "El motivo es obligatorio").max(300),
  observacion: z.string().max(500).optional().nullable(),
  bodegaId: z.string().min(1, "La bodega es obligatoria"),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidadSistema: z.number().int().min(0),
        cantidadFisica: z.number().int().min(0),
        costoUnit: z.number().min(0).optional().default(0),
        lote: z.string().max(60).optional().nullable(),
      })
    )
    .min(1, "Debe incluir al menos un item"),
});

export const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(150),
  nit: z.string().max(20).optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  email: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
  contacto: z.string().max(100).optional().nullable(),
  listaPrecioId: z.string().optional().nullable(),
  limiteCredito: z.number().min(0).optional().default(0),
  diasCredito: z.number().int().min(0).optional().default(0),
  activo: z.boolean().optional().default(true),
  notas: z.string().max(500).optional().nullable(),
});

export type UbicacionInput = z.infer<typeof ubicacionSchema>;
export type ProductoUnidadInput = z.infer<typeof productoUnidadSchema>;
export type ListaPrecioInput = z.infer<typeof listaPrecioSchema>;
export type NumeroSerieInput = z.infer<typeof numeroSerieSchema>;
export type DevolucionInput = z.infer<typeof devolucionSchema>;
export type AjusteInput = z.infer<typeof ajusteSchema>;
export type ClienteInput = z.infer<typeof clienteSchema>;

// ==========================================================================
// CICLO COMERCIAL
// ==========================================================================

export const cotizacionItemSchema = z.object({
  productoId: z.string().min(1),
  descripcion: z.string().max(200).optional().nullable(),
  cantidad: z.number().int().min(1),
  precioUnit: z.number().min(0),
  descuento: z.number().min(0).max(100).optional().default(0),
});

export const cotizacionSchema = z.object({
  clienteId: z.string().min(1, "El cliente es obligatorio"),
  validaHasta: z.string().optional().nullable(),
  notas: z.string().max(500).optional().nullable(),
  descuentoGlobal: z.number().min(0).optional().default(0),
  impuestoPct: z.number().min(0).max(100).optional().default(12),
  items: z.array(cotizacionItemSchema).min(1, "Debe incluir al menos un item"),
});

export const ventaItemSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().int().min(1),
  precioUnit: z.number().min(0),
  descuento: z.number().min(0).max(100).optional().default(0),
});

export const ventaSchema = z.object({
  tipo: z.enum(["POS", "FACTURA", "CREDITO"]).default("POS"),
  clienteId: z.string().optional().nullable(),
  bodegaId: z.string().min(1, "La bodega es obligatoria"),
  cajaId: z.string().optional().nullable(),
  descuentoGlobal: z.number().min(0).optional().default(0),
  impuestoPct: z.number().min(0).max(100).optional().default(12),
  metodoPago: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CHEQUE", "CREDITO", "OTRO"]).optional().default("EFECTIVO"),
  pagoInmediato: z.boolean().optional().default(true),
  montoPagado: z.number().min(0).optional(),
  notas: z.string().max(500).optional().nullable(),
  items: z.array(ventaItemSchema).min(1, "Debe incluir al menos un item"),
});

export const pagoSchema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0"),
  metodo: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CHEQUE", "CREDITO", "OTRO"]).default("EFECTIVO"),
  referencia: z.string().max(100).optional().nullable(),
  cajaId: z.string().optional().nullable(),
});

export const notaSchema = z.object({
  tipo: z.enum(["CREDITO", "DEBITO"]),
  motivo: z.string().min(1, "El motivo es obligatorio").max(300),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  ventaId: z.string().optional().nullable(),
  clienteId: z.string().optional().nullable(),
});

export const cajaAbrirSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(80),
  montoInicial: z.number().min(0).optional().default(0),
});

export const cajaCerrarSchema = z.object({
  montoFinal: z.number().min(0),
  notas: z.string().max(300).optional().nullable(),
});

export const cajaMovimientoSchema = z.object({
  tipo: z.enum(["INGRESO", "EGRESO", "RETIRO", "VENTA", "DEVOLUCION"]),
  monto: z.number().positive(),
  concepto: z.string().min(1).max(200),
  referencia: z.string().max(100).optional().nullable(),
});

export type CotizacionInput = z.infer<typeof cotizacionSchema>;
export type VentaInput = z.infer<typeof ventaSchema>;
export type PagoInput = z.infer<typeof pagoSchema>;
export type NotaInput = z.infer<typeof notaSchema>;
export type CajaMovimientoInput = z.infer<typeof cajaMovimientoSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type TenantInput = z.infer<typeof tenantSchema>;
export type BodegaInput = z.infer<typeof bodegaSchema>;
export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type ProveedorInput = z.infer<typeof proveedorSchema>;
export type ProductoInput = z.infer<typeof productoSchema>;
export type MovimientoInput = z.infer<typeof movimientosSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
export type ConteoInput = z.infer<typeof conteoSchema>;
export type ConteoItemInput = z.infer<typeof conteoItemSchema>;
export type AlertaInput = z.infer<typeof alertaSchema>;
export type ImportCSVInput = z.infer<typeof importCSVSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordUpdateInput = z.infer<typeof passwordUpdateSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
