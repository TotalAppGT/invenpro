# InvenPro SaaS

**Sistema de Gestión de Inventario Multi-Tenant para Guatemala**

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Prisma](https://img.shields.io/badge/Prisma-5.22-teal)
![License](https://img.shields.io/badge/license-proprietary-red)

InvenPro es una plataforma SaaS multi-tenant para la gestión integral de inventarios, diseñada específicamente para empresas guatemaltecas. Permite administrar bodegas, productos, movimientos, proveedores, kardex, reportes y más desde una interfaz moderna y profesional.

---

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Estilos** | Tailwind CSS, Radix UI, Framer Motion |
| **ORM** | Prisma ORM |
| **Base de Datos** | PostgreSQL |
| **Autenticación** | Firebase Auth |
| **Pagos** | Stripe |
| **Email** | Resend |
| **Estado Global** | Zustand |
| **Validación** | Zod, React Hook Form |
| **Gráficos** | Recharts |
| **Código de Barras** | html5-qrcode, jspdf |
| **Despliegue** | Railway |

---

## Módulos

- **Dashboard** - Panel principal con indicadores clave y gráficos
- **Bodegas** - Gestión multi-bodega con ubicaciones y encargados
- **Productos** - Catálogo con categorías, SKU, código de barras, imágenes
- **Inventario** - Control de stock por bodega con lotes y fechas de vencimiento
- **Movimientos** - Entradas, salidas, ajustes y traslados con trazabilidad
- **Kardex** - Historial de valuación de inventario (PEPS / Promedio Ponderado)
- **Proveedores** - Registro con NIT, contactos y productos asociados
- **Órdenes de Compra** - Generación, seguimiento y recepción de órdenes
- **Conteos** - Conteos físicos con conciliación de diferencias
- **Alertas** - Notificaciones por stock bajo, vencimientos y eventos
- **Reportes** - Exportables en PDF, CSV y Excel
- **Etiquetas** - Generación de códigos de barras y QR
- **Administración** - Gestión de usuarios, roles y permisos
- **Suscripción** - Planes y facturación integrada con Stripe
- **Admin Panel** - Panel de super administrador para gestión de tenants

---

## Prerrequisitos

- **Node.js** 18 o superior
- **PostgreSQL** 14 o superior
- Proyecto en **Firebase** (con Authentication habilitado)
- Cuenta en **Stripe**
- Cuenta en **Resend** (para emails transaccionales)
- Cuenta en **Railway** (para despliegue)

---

## Variables de Entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

### Variables requeridas:

```env
# Base de Datos
DATABASE_URL="postgresql://user:password@host:5432/invenpro"

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (Service Account)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key

# JWT Session Encryption
SESSION_ENCRYPTION_KEY=your_random_32_char_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe Price IDs
STRIPE_PRICE_EMPRENDEDOR_MONTHLY=price_...
STRIPE_PRICE_EMPRENDEDOR_YEARLY=price_...
STRIPE_PRICE_NEGOCIO_MONTHLY=price_...
STRIPE_PRICE_NEGOCIO_YEARLY=price_...
STRIPE_PRICE_CORPORATIVO_MONTHLY=price_...
STRIPE_PRICE_CORPORATIVO_YEARLY=price_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@invenpro.gt

# App
NEXT_PUBLIC_APP_URL=https://invenpro.gt
NEXT_PUBLIC_APP_NAME=InvenPro
```

---

## Instalación y Configuración Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TotalAppGT/invenpro-saas.git
cd invenpro-saas

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Generar el cliente de Prisma
npx prisma generate

# 5. Crear la base de datos (sin migraciones, para desarrollo)
npx prisma db push

# 6. Ejecutar el seed de datos
npm run db:seed

# 7. Iniciar el servidor de desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:3000`.

---

## Credenciales de Acceso (Seed)

### Super Admin
- **Email:** totalappgt@gmail.com
- **Contraseña:** admintotal

> **Nota:** Las credenciales del seed requieren que el usuario exista en Firebase Auth para iniciar sesión. Configure Firebase Authentication manualmente o use el flujo de registro.

---

## Despliegue en Railway

1. Crear una nueva app en [Railway](https://railway.app)
2. Conectar con el repositorio de GitHub
3. Agregar un servicio de **PostgreSQL**
4. Configurar todas las variables de entorno en la sección **Variables**
5. Railway detectará automáticamente el archivo `railway.toml` y usará:

```toml
[build]
  builder = "nixpacks"
  buildCommand = "npx prisma generate && npm run build"

[deploy]
  startCommand = "npm start"

[service]
  healthcheckPath = "/api/health"
```

6. Desplegar. La migración de base de datos se ejecuta manualmente la primera vez:

```bash
# En la terminal de Railway:
npx prisma db push
npm run db:seed
```

---

## Estructura del Proyecto

```
invenpro-saas/
├── app/
│   ├── (auth)/              # Páginas públicas (login, register)
│   ├── (dashboard)/         # Páginas protegidas del dashboard
│   │   ├── dashboard/       # Dashboard principal
│   │   ├── bodegas/         # Gestión de bodegas
│   │   ├── productos/       # Catálogo de productos
│   │   ├── inventario/      # Control de inventario
│   │   ├── movimientos/     # Historial de movimientos
│   │   ├── kardex/          # Valuación de inventario
│   │   ├── proveedores/     # Gestión de proveedores
│   │   ├── ordenes-compra/  # Órdenes de compra
│   │   ├── conteos/         # Conteos físicos
│   │   ├── alertas/         # Alertas y notificaciones
│   │   ├── reportes/        # Reportes exportables
│   │   ├── etiquetas/       # Generación de etiquetas
│   │   ├── usuarios/        # Gestión de usuarios
│   │   ├── configuracion/   # Configuración del tenant
│   │   ├── suscripcion/     # Gestión de suscripción
│   │   └── perfil/          # Perfil de usuario
│   ├── admin/               # Panel de Super Admin
│   ├── api/                 # API Routes
│   │   ├── auth/            # Autenticación y sesiones
│   │   ├── dashboard/       # Estadísticas
│   │   ├── bodegas/         # CRUD bodegas
│   │   ├── productos/       # CRUD productos
│   │   ├── inventario/      # Inventario y ajustes
│   │   ├── movimientos/     # Registro de movimientos
│   │   ├── kardex/          # Datos de kardex
│   │   ├── proveedores/     # CRUD proveedores
│   │   ├── ordenes-compra/  # Órdenes de compra
│   │   ├── conteos/         # Conteos de inventario
│   │   ├── alertas/         # Sistema de alertas
│   │   ├── reportes/        # Generación de reportes
│   │   ├── tenant/          # Configuración de tenant
│   │   ├── usuarios/        # CRUD usuarios
│   │   ├── upload/          # Subida de archivos
│   │   └── webhooks/stripe/ # Webhooks de Stripe
│   └── layout.tsx           # Layout raíz
├── components/
│   ├── ui/                  # Componentes de interfaz (shadcn-style)
│   ├── layout/              # Sidebar, Topbar, AppLayout
│   ├── forms/               # Formularios reutilizables
│   ├── dashboard/           # Widgets del dashboard
│   ├── landing/             # Componentes de landing page
│   └── providers.tsx        # Proveedores de contexto (Auth, Theme)
├── hooks/
│   ├── useAuth.ts           # Hook de autenticación
│   ├── useApi.ts            # Hook para llamadas API
│   ├── useBarcodeScanner.ts # Hook de escáner de código de barras
│   ├── useDebounce.ts       # Hook de debounce
│   └── usePagination.ts     # Hook de paginación
├── lib/
│   ├── auth.ts              # Autenticación server-side
│   ├── firebase.ts          # Configuración Firebase Client
│   ├── firebase-admin.ts    # Configuración Firebase Admin
│   ├── prisma.ts            # Cliente Prisma singleton
│   ├── permissions.ts       # Sistema de roles y permisos
│   ├── stripe.ts            # Cliente Stripe
│   ├── resend.ts            # Cliente Resend para emails
│   ├── subscriptions.ts     # Lógica de suscripciones
│   ├── inventory-valuation.ts # Valuación de inventario
│   ├── validations.ts       # Esquemas de validación Zod
│   └── utils.ts             # Utilidades generales
├── prisma/
│   ├── schema.prisma        # Esquema de base de datos
│   └── seed.ts              # Script de datos iniciales
├── store/
│   └── index.ts             # Store global con Zustand
├── types/
│   └── index.ts             # Tipos y interfaces TypeScript
├── public/                  # Archivos estáticos
├── emails/                  # Plantillas de email (Resend)
├── .env.example             # Variables de entorno de ejemplo
├── .gitignore
├── middleware.ts            # Middleware de Next.js
├── railway.toml             # Configuración de despliegue Railway
├── tailwind.config.ts       # Configuración de Tailwind CSS
├── tsconfig.json            # Configuración de TypeScript
├── next.config.js           # Configuración de Next.js
├── postcss.config.js        # Configuración de PostCSS
└── package.json
```

---

## Planes y Precios

| Característica | Emprendedor | Negocio | Corporativo |
|---------------|:----------:|:-------:|:-----------:|
| **Precio Mensual** | Q149 | Q449 | Q999 |
| **Precio Anual** | Q1,430 | Q4,310 | Q9,590 |
| **Usuarios** | 3 | 10 | Ilimitado |
| **Bodegas** | 2 | 10 | Ilimitado |
| **Productos** | 500 | Ilimitado | Ilimitado |
| **Movimientos** | 1,000 | Ilimitado | Ilimitado |
| Dashboard | Basico | Avanzado | Ejecutivo |
| Exportar CSV | Incluido | Incluido | Incluido |
| Exportar Excel/PDF | - | Incluido | Incluido |
| Órdenes de Compra | - | Incluido | Incluido |
| Alertas | - | Incluido | Incluido |
| API de acceso | - | Incluido | Completo |
| Soporte | Email | Prioritario | VIP WhatsApp |
| Capacitación | - | - | Incluida |

---

## Licencia

Software propietario. Todos los derechos reservados.

© 2026 TotalAppGT - Soluciones Tecnológicas para Guatemala.

---

## Contacto

- **Email:** [totalappgt@gmail.com](mailto:totalappgt@gmail.com)
- **WhatsApp:** [+502 58303182](https://wa.me/50258303182)
- **Desarrollado por:** TotalAppGT

---

## Créditos

InvenPro SaaS es desarrollado y mantenido por **TotalAppGT**, proveedor de soluciones tecnológicas empresariales en Guatemala.

- Diseño de arquitectura y desarrollo full-stack
- Integración con Firebase, Stripe y Resend
- Sistema multi-tenant con aislamiento de datos
- Interfaz moderna con Tailwind CSS y Radix UI
