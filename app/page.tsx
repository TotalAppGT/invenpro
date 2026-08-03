"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Warehouse,
  BookOpen,
  Smartphone,
  Scan,
  BellRing,
  BarChart3,
  Users,
  Upload,
  Star,
  ArrowRight,
  Check,
  Shield,
  Zap,
  Clock,
  Globe,
  Boxes,
  TrendingUp,
  HeadphonesIcon,
  ChevronRight,
  ShoppingCart,
  ClipboardCheck,
  Printer,
  QrCode,
  MessageCircle,
  FileText,
  Download,
  RotateCcw,
  Building2,
  Menu,
  X,
  ChevronDown,
  Lock,
  Mail,
  Phone,
  HelpCircle,
  Server,
  Activity,
  RefreshCw,
  Package,
  Layers,
  Settings,
  PieChart,
  CalendarCheck,
  Tags,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const trustStats = [
  { icon: MapPin, label: "Hecho en Guatemala", color: "text-sky-400" },
  { icon: MessageCircle, label: "Soporte WhatsApp", color: "text-emerald-400" },
  { icon: Server, label: "99.9% Uptime", color: "text-green-400" },
  { icon: Clock, label: "14 Dias Gratis", color: "text-indigo-400" },
];

const features = [
  {
    icon: Warehouse,
    title: "Multi-Bodega en Tiempo Real",
    description:
      "Gestiona múltiples ubicaciones y bodegas desde un solo panel centralizado. Visibilidad total de inventario distribuido con sincronización instantánea en todas tus sucursales.",
  },
  {
    icon: BookOpen,
    title: "Kardex Valorizado",
    description:
      "Trazabilidad completa con métodos PEPS, UEPS y Promedio Ponderado. Cada entrada, salida, ajuste y traslado queda registrado automáticamente con su valoración al costo.",
  },
  {
    icon: Smartphone,
    title: "Conteos Físicos Cíclicos",
    description:
      "Convierte tu celular en un handheld profesional. Realiza conteos físicos programados por categoría, ubicación o producto. Escanea, cuenta y concilia diferencias.",
  },
  {
    icon: Printer,
    title: "Códigos de Barras y Etiquetas",
    description:
      "Genera códigos de barras EAN-13, UPC-A, QR y etiquetas personalizables. Imprime directamente con tamaños configurables y campos de tu elección (precio, nombre, SKU).",
  },
  {
    icon: ShoppingCart,
    title: "Órdenes de Compra y Recepción",
    description:
      "Crea órdenes de compra desde el sistema y recibe mercadería escaneando productos. Validación automática de cantidades, precios y aceptación parcial o total de cada orden.",
  },
  {
    icon: ClipboardCheck,
    title: "Cuadres y Conciliaciones",
    description:
      "Programa cuadres de inventario periódicos con flujo de aprobación. El sistema compara automáticamente el stock teórico vs. el físico y genera reportes de diferencias.",
  },
  {
    icon: BellRing,
    title: "Alertas Inteligentes",
    description:
      "Notificaciones por email, app y WhatsApp Business. Stock bajo, productos próximos a vencer, movimientos críticos y recordatorios de conteos programados.",
  },
  {
    icon: BarChart3,
    title: "Dashboards y Reportería",
    description:
      "KPIs en tiempo real con dashboards interactivos. Exporta reportes a Excel, PDF y formatos contables. Análisis de rotación, valorización, tendencias y proyecciones.",
  },
  {
    icon: MessageCircle,
    title: "Integración WhatsApp Business",
    description:
      "Recibe notificaciones por WhatsApp, consulta saldos con comandos simples y comparte reportes de inventario directamente con tu equipo desde la plataforma de mensajería que ya usas.",
  },
  {
    icon: Settings,
    title: "Multi-Usuario con Roles",
    description:
      "Roles y permisos configurables: Administrador, Supervisor, Operador, Auditor y Consultor. Cada usuario accede solo a las funciones y bodegas que le corresponden según su rol.",
  },
  {
    icon: Activity,
    title: "Auditoría de Operaciones",
    description:
      "Registro completo de cada operación: quién, qué, cuándo y desde dónde. Bitácora inalterable exportable para auditorías internas o externas. Cumplimiento garantizado.",
  },
  {
    icon: Globe,
    title: "Multi-Dispositivo Responsive",
    description:
      "Accede desde computadora, tablet o celular. Interfaz 100% responsive optimizada con diseño táctil. Trabaja desde la oficina, la bodega o donde estés.",
  },
];

const howItWorksSteps = [
  {
    step: 1,
    icon: Users,
    title: "Regístrate en 30 segundos",
    description: "Crea tu cuenta gratuita. Solo necesitas tu email y el nombre de tu empresa. Sin tarjeta de crédito.",
  },
  {
    step: 2,
    icon: Building2,
    title: "Configura tu empresa",
    description: "Define tus bodegas, usuarios y roles. Estructura tu inventario con categorías, marcas y unidades de medida a tu medida.",
  },
  {
    step: 3,
    icon: Upload,
    title: "Carga tu inventario",
    description: "Importa masivamente tus productos desde Excel o CSV. El sistema valida y te muestra inconsistencias antes de cargar.",
  },
  {
    step: 4,
    icon: TrendingUp,
    title: "Gestiona y optimiza",
    description: "Controla entradas, salidas y traslados. Monitorea KPIs, programa conteos y recibe alertas inteligentes. Tu inventario bajo control total.",
  },
];

const advancedModules = [
  {
    icon: CalendarCheck,
    title: "Cuadres Cíclicos Programables",
    description:
      "Configura cuadres automáticos por categoría, ubicación o proveedor con frecuencia diaria, semanal o mensual. Notificaciones de inicio y cierre de cada cuadre.",
    gradient: "from-emerald-500/20 to-teal-600/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: QrCode,
    title: "Generador de Etiquetas y Códigos",
    description:
      "Diseñador visual de etiquetas con códigos de barras, QR, logos y texto libre. Plantillas predefinidas para productos, estanterías y pallets. Impresión por lote.",
    gradient: "from-amber-500/20 to-orange-600/20",
    iconColor: "text-amber-400",
  },
  {
    icon: ShoppingCart,
    title: "Módulo de Compras y Recepción",
    description:
      "Flujo completo de compras: solicitud → cotización → orden → recepción. Recepción parcial o total con lectura de códigos. Actualización automática de stock y kardex.",
    gradient: "from-sky-500/20 to-blue-600/20",
    iconColor: "text-sky-400",
  },
  {
    icon: FileText,
    title: "Cierres de Inventario Contables",
    description:
      "Cierres periódicos con valorización contable. Reportes de inventario valorizado por método PEPS/UEPS/Promedio listos para tu contador. Exportación a formatos contables.",
    gradient: "from-purple-500/20 to-violet-600/20",
    iconColor: "text-purple-400",
  },
  {
    icon: Activity,
    title: "Auditoría y Trazabilidad Total",
    description:
      "Bitácora inalterable de cada transacción con fecha, hora, usuario y dispositivo. Ideal para auditorías internas, externas y cumplimiento normativo. Exportable a Excel.",
    gradient: "from-rose-500/20 to-pink-600/20",
    iconColor: "text-rose-400",
  },
  {
    icon: PieChart,
    title: "Dashboard de KPIs en Tiempo Real",
    description:
      "Visualiza rotación de productos, valor total de inventario, productos sin movimiento, top ventas, productos por vencer y más. Filtros por bodega, categoría y período.",
    gradient: "from-indigo-500/20 to-indigo-600/20",
    iconColor: "text-indigo-400",
  },
];

const plans = [
  {
    name: "Emprendedor",
    priceMonthly: 199,
    priceYearly: 1990,
    popular: false,
    description: "Perfecto para pequeños negocios que necesitan controlar su inventario de forma profesional.",
    features: [
      "3 usuarios incluidos",
      "2 bodegas",
      "Hasta 500 productos",
      "Kardex valorizado básico",
      "Alertas de stock bajo por email",
      "Reportes PDF y Excel",
      "Escáner de códigos de barras",
      "Soporte por email",
      "14 días de prueba gratis",
    ],
  },
  {
    name: "Negocio",
    priceMonthly: 349,
    priceYearly: 3490,
    popular: true,
    description: "La opción más elegida por empresas guatemaltecas. Control total de inventario con funciones avanzadas.",
    features: [
      "10 usuarios incluidos",
      "10 bodegas",
      "Productos ilimitados",
      "Kardex avanzado (PEPS/UEPS/Promedio)",
      "Conteos físicos con app móvil",
      "Alertas por WhatsApp Business",
      "Dashboards en tiempo real",
      "Órdenes de compra y recepción",
      "API REST básica",
      "Soporte prioritario 24/7",
      "Importación masiva CSV/Excel",
      "Etiquetas personalizables",
    ],
  },
  {
    name: "Corporativo",
    priceMonthly: 799,
    priceYearly: 7990,
    popular: false,
    description: "Solución empresarial completa. Para organizaciones que requieren integración total y personalización.",
    features: [
      "Usuarios ilimitados",
      "Bodegas ilimitadas",
      "Productos ilimitados",
      "API REST completa",
      "White Label opcional",
      "WhatsApp Business API",
      "SLA 24/7 garantizado",
      "Capacitacion personalizada",
      "Integraciones a medida",
      "Gerente de cuenta dedicado",
      "Migracion de datos asistida",
      "Auditoria avanzada",
      "Cierres contables automatizados",
      "Soporte telefonico + WhatsApp",
    ],
  },
];

const comparisonFeatures = [
  { name: "Usuarios", emprendedor: "3", negocio: "10", corporativo: "Ilimitados" },
  { name: "Bodegas", emprendedor: "2", negocio: "10", corporativo: "Ilimitadas" },
  { name: "Productos", emprendedor: "500", negocio: "Ilimitados", corporativo: "Ilimitados" },
  { name: "Kardex valorizado", emprendedor: "Básico", negocio: "PEPS/UEPS/Promedio", corporativo: "PEPS/UEPS/Promedio" },
  { name: "Conteos físicos", emprendedor: "—", negocio: "Completo", corporativo: "Avanzado" },
  { name: "Alertas inteligentes", emprendedor: "Email", negocio: "Email + WhatsApp", corporativo: "Email + WhatsApp + API" },
  { name: "Dashboards KPIs", emprendedor: "—", negocio: "Incluido", corporativo: "Personalizable" },
  { name: "Órdenes de compra", emprendedor: "—", negocio: "Incluido", corporativo: "Avanzado" },
  { name: "API REST", emprendedor: "—", negocio: "Básica", corporativo: "Completa" },
  { name: "White Label", emprendedor: "—", negocio: "—", corporativo: "Disponible" },
  { name: "WhatsApp Business API", emprendedor: "—", negocio: "—", corporativo: "Incluido" },
  { name: "Soporte", emprendedor: "Email", negocio: "Prioritario", corporativo: "24/7 SLA" },
  { name: "Capacitación", emprendedor: "—", negocio: "—", corporativo: "Personalizada" },
  { name: "Exportación", emprendedor: "PDF, Excel", negocio: "PDF, Excel, CSV", corporativo: "Todos + Contables" },
];

const testimonials = [
  {
    name: "María Fernanda López",
    role: "Gerente General",
    company: "Distribuidora El Sol, S.A.",
    quote:
      "Desde que implementamos InvenPro, nuestro control de inventario mejoró un 80%. Antes perdíamos horas en conciliaciones manuales. Ahora todo está automatizado y en tiempo real. El soporte por WhatsApp es rapidísimo.",
    stars: 5,
  },
  {
    name: "Carlos Méndez",
    role: "Director de Operaciones",
    company: "Importadora Maya",
    quote:
      "Manejamos 3 bodegas en diferentes departamentos y con InvenPro finalmente tenemos visibilidad total. Las alertas de stock bajo nos han salvado de quedarnos sin producto en temporada alta. El kardex valorizado es exactamente lo que necesitábamos.",
    stars: 5,
  },
  {
    name: "Ana Lucía Pérez",
    role: "CEO",
    company: "Grupo Comercial Express",
    quote:
      "Lo que más valoro es que son un equipo guatemalteco que entiende nuestras necesidades locales. El sistema es intuitivo y mis empleados lo aprendieron en días. Los conteos cíclicos con el celular nos ahorran horas de trabajo. Recomendado al 100%.",
    stars: 5,
  },
];

const faqs = [
  {
    question: "¿Necesito instalar algo para usar InvenPro?",
    answer:
      "No. InvenPro es 100% en la nube. Solo necesitas un navegador web e internet. Funciona en computadoras, tablets y teléfonos sin instalar software. Las actualizaciones son automáticas y no interrumpen tu operación.",
  },
  {
    question: "¿Mis datos están seguros en la plataforma?",
    answer:
      "Absolutamente. Usamos encriptación bancaria SSL/TLS 256-bit para todas las conexiones. Tus datos se almacenan en servidores seguros con copias de seguridad automáticas diarias. Cumplimos con los más altos estándares de seguridad y protección de datos. Nadie más que tu empresa tiene acceso a tu información.",
  },
  {
    question: "¿Puedo migrar mis datos desde otro sistema o desde Excel?",
    answer:
      "Sí. InvenPro incluye importación masiva desde archivos Excel y CSV con validación inteligente. Si vienes de otro sistema, nuestro equipo de soporte te asiste con la migración sin costo adicional en planes Negocio y Corporativo.",
  },
  {
    question: "¿Cómo funciona la prueba gratuita de 14 días?",
    answer:
      "Te registras sin tarjeta de crédito y obtienes acceso completo a todas las funcionalidades del plan Negocio durante 14 días. Puedes cargar tu inventario real, invitar usuarios y probar cada herramienta. Al finalizar, eliges el plan que mejor se adapte a tu empresa o cancelas sin ningún compromiso.",
  },
  {
    question: "¿Ofrecen soporte y capacitación en Guatemala?",
    answer:
      "Sí. Somos una empresa guatemalteca y todo nuestro soporte es local. Puedes contactarnos por WhatsApp al 58303182, por email a totalappgt@gmail.com o agendar una videollamada. Los planes Corporativos incluyen capacitación presencial personalizada. Entendemos las necesidades y regulaciones del mercado guatemalteco.",
  },
  {
    question: "¿Puedo integrar InvenPro con mi sistema contable o e-commerce?",
    answer:
      "Sí. Nuestra API REST permite integraciones con sistemas contables (FEL, facturación electrónica), plataformas de e-commerce y ERPs. El plan Negocio incluye API básica y el plan Corporativo ofrece API completa con documentación detallada y soporte para integraciones a medida. También exportamos a formatos contables estándar.",
  },
];

function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  isDecimal = false,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  isDecimal?: boolean;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [inView, value, duration]);

  const displayValue = isDecimal ? count.toFixed(1) : count.toLocaleString("es-GT");

  return (
    <span ref={ref}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingScript = document.getElementById("particles-js");
    if (!existingScript) {
      const canvas = document.createElement("canvas");
      canvas.id = "particles-canvas";
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "0";
      canvas.style.opacity = "0.5";
      const heroSection = document.getElementById("hero-section");
      if (heroSection) heroSection.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener("resize", resize);

      for (let i = 0; i < 80; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 0.5,
        });
      }

      let animationId: number;
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(99, 102, 241, 0.15)";
          ctx.fill();
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[j].x - p.x;
            const dy = particles[j].y - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 120) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(99, 102, 241, ${0.04 * (1 - distance / 120)})`;
              ctx.stroke();
            }
          }
        });
        animationId = requestAnimationFrame(draw);
      };
      draw();

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener("resize", resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
      {/* ==================== NAVBAR ==================== */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.04] bg-[#0a0a1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold tracking-tight">
                Inven<span className="text-indigo-400">Pro</span>
              </span>
              <span className="text-[10px] text-muted-foreground -mt-0.5">by TotalAppGT</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: "Inicio", href: "#inicio" },
              { label: "Funcionalidades", href: "#funcionalidades" },
              { label: "Precios", href: "#precios" },
              { label: "Testimonios", href: "#testimonios" },
              { label: "Contacto", href: "#contacto" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-white"
            >
              Iniciar Sesión
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/20"
              >
                Prueba Gratis
              </Button>
            </Link>
          </div>

          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-white/[0.04] bg-[#0a0a1a]/95 backdrop-blur-xl"
            >
              <div className="px-4 py-4 space-y-3">
                {["Inicio", "Funcionalidades", "Precios", "Testimonios", "Contacto"].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    {item}
                  </a>
                ))}
                <div className="pt-3 border-t border-white/[0.04] flex flex-col gap-3">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm text-muted-foreground hover:text-white">
                    Iniciar Sesión
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-indigo-500 to-violet-600">
                      Prueba Gratis
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ==================== HERO SECTION ==================== */}
      <section id="hero-section" className="cosmic-bg relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="cosmic-grid" />
        <div className="cosmic-orb cosmic-orb-1" />
        <div className="cosmic-orb cosmic-orb-2" />
        <div className="cosmic-orb cosmic-orb-3" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
              >
                <span className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                  <Zap className="mr-1 h-3 w-3" /> +1,000 empresas confían
                </span>
                <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                  <MapPin className="mr-1 h-3 w-3" /> Soporte local GT
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                  <Clock className="mr-1 h-3 w-3" /> 14 días gratis
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl"
              >
                Control de{" "}
                <span className="text-gradient-hero glow-text">Inventario</span>
                <br />
                Empresarial
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-lg leading-relaxed text-muted-foreground"
              >
                El sistema de gestión de inventario más completo de Guatemala.
                Multi-bodega, multi-usuario, 100% en la nube. Diseñado para
                empresas que buscan control, eficiencia y crecimiento.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start"
              >
                <Link href="/register">
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-base font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700 sm:w-auto group"
                  >
                    Comenzar Prueba Gratis
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/10 text-base hover:bg-white/5 group sm:w-auto"
                >
                  Agendar Demo
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground lg:justify-start"
              >
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-green-400" />
                  No requiere tarjeta
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 text-indigo-400" />
                  Cancela cuando quieras
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:block"
            >
              <div className="glass relative rounded-2xl p-1 shadow-2xl shadow-indigo-500/10">
                <div className="rounded-xl bg-[#0f0f2e] p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="ml-2 text-xs text-muted-foreground">
                      Dashboard — InvenPro
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-3">
                    {[
                      { label: "Productos", value: "2,847", pct: "+8%", color: "from-indigo-500 to-indigo-600" },
                      { label: "Bodegas", value: "6", pct: "activas", color: "from-violet-500 to-violet-600" },
                      { label: "Valor Inv.", value: "Q854K", pct: "+12%", color: "from-purple-500 to-purple-600" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-lg bg-white/[0.03] p-3">
                        <div className={cn("mb-2 h-1.5 w-8 rounded-full bg-gradient-to-r", card.color)} />
                        <p className="text-lg font-bold text-white">{card.value}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-muted-foreground">{card.label}</p>
                          <p className="text-[10px] text-green-400">{card.pct}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3 h-36 rounded-lg bg-white/[0.02] p-3">
                    <p className="mb-2 text-[10px] text-muted-foreground">Movimientos últimos 7 días</p>
                    <div className="flex h-full items-end gap-1.5">
                      {[45, 68, 55, 82, 60, 90, 75].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500/60 to-indigo-400/30 group relative">
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {h}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Alertas activas</span>
                        <span className="text-[10px] text-amber-400 font-bold">3</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5">
                        <div className="h-1 w-[65%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground">Conteo pendiente</span>
                        <span className="text-[10px] text-green-400 font-bold">1</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5">
                        <div className="h-1 w-[30%] rounded-full bg-gradient-to-r from-green-500 to-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <span className="animate-pulse">Descubre más</span>
            <div className="h-8 w-5 rounded-full border border-white/10">
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mx-auto mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ==================== TRUST BAR ==================== */}
      <section className="relative border-y border-white/[0.04] bg-[#0f0f2e]/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-6 md:grid-cols-4"
          >
            {trustStats.map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-2 text-center">
                <item.icon className={cn("h-5 w-5", item.color)} />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== FEATURES SECTION ==================== */}
      <section id="funcionalidades" className="relative py-24 sm:py-32">
        <div className="cosmic-grid" />
        <div className="cosmic-orb cosmic-orb-1" style={{ opacity: 0.4 }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Funcionalidades
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Todo lo que necesitas para{" "}
              <span className="text-gradient">dominar tu inventario</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              InvenPro combina las herramientas más avanzadas de gestión de
              inventario en una plataforma intuitiva diseñada para empresas guatemaltecas.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="glass group relative rounded-xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-600/20 ring-1 ring-indigo-500/20 transition-all group-hover:from-indigo-500/30 group-hover:to-violet-600/30 group-hover:scale-105">
                  <feature.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="relative py-24 sm:py-32 bg-[#0f0f2e]/30">
        <div className="cosmic-orb cosmic-orb-3" style={{ opacity: 0.5 }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Cómo Funciona
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Empieza en <span className="text-gradient">4 pasos</span>
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 ring-1 ring-indigo-500/20">
                  <step.icon className="h-7 w-7 text-indigo-400" />
                </div>
                <div className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ADVANCED MODULES ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="cosmic-grid" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Módulos Avanzados
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Lo que nos hace{" "}
              <span className="text-gradient">diferentes</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Funcionalidades de nivel empresarial que te dan ventaja competitiva
              frente a soluciones tradicionales y genéricas.
            </p>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advancedModules.map((mod, index) => (
              <motion.div
                key={mod.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="glass group relative rounded-xl p-6 transition-all duration-300 hover:border-indigo-500/30"
              >
                <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-0", mod.gradient)} />
                <div className="relative z-10">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/5">
                    <mod.icon className={cn("h-6 w-6", mod.iconColor)} />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">{mod.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="precios" className="relative py-24 sm:py-32 bg-[#0f0f2e]/30">
        <div className="cosmic-bg absolute inset-0 opacity-30" />
        <div className="cosmic-orb cosmic-orb-2" style={{ opacity: 0.5 }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Precios
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Planes para{" "}
              <span className="text-gradient">cada etapa de tu empresa</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Elige el plan que mejor se adapte a tu negocio. Todos incluyen{" "}
              <span className="text-green-400 font-semibold">14 dias de prueba gratis</span>{" "}
              sin compromiso y sin tarjeta de credito.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <span className={cn("text-sm", !isAnnual ? "text-white font-medium" : "text-muted-foreground")}>
              Facturación Mensual
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={cn(
                "relative h-7 w-14 rounded-full transition-colors",
                isAnnual ? "bg-indigo-500" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: isAnnual ? 28 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
              />
            </button>
              <span className={cn("text-sm flex items-center gap-2", isAnnual ? "text-white font-medium" : "text-muted-foreground")}>
                Facturacion Anual
                <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                  2 meses gratis
                </span>
              </span>
          </motion.div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {plans.map((plan, index) => {
              const annualTotal = plan.priceYearly * 12;
              const monthlyTotal = plan.priceMonthly * 12;
              const savings = monthlyTotal - annualTotal;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "glass relative flex flex-col rounded-2xl p-8 transition-all duration-300",
                    plan.popular
                      ? "border-indigo-500/30 shadow-lg shadow-indigo-500/10 scale-[1.02] lg:scale-105 z-10"
                      : "hover:border-white/10"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-1 text-xs font-bold text-white shadow-xl shadow-indigo-500/30">
                        Más Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-5 flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">Q</span>
                      <span className="text-5xl font-bold text-white">
                        {plan.priceMonthly}
                      </span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                    {isAnnual ? (
                      <p className="mt-2 text-xs text-green-400">
                        Q{plan.priceYearly.toLocaleString("es-GT")}/ano
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Q{(plan.priceMonthly * 12).toLocaleString("es-GT")}/ano
                      </p>
                    )}
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button
                      className={cn(
                        "w-full font-semibold",
                        plan.popular
                          ? "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25"
                          : "border border-white/10 bg-transparent hover:bg-white/5"
                      )}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.name === "Corporativo" ? "Contactar Ventas" : "Comenzar Ahora"}
                    </Button>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Necesitas más de 10 usuarios? El plan Negocio permite usuarios adicionales por Q49/mes c/u.
          </p>
        </div>
      </section>

      {/* ==================== COMPARISON TABLE ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Comparativa
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Compara <span className="text-gradient">cada detalle</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 overflow-x-auto rounded-2xl glass"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="px-6 py-4 text-left font-semibold text-white">Funcionalidad</th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Emprendedor</th>
                  <th className="px-6 py-4 text-center font-semibold text-white bg-indigo-500/5">
                    <span className="text-indigo-400">Negocio</span>
                  </th>
                  <th className="px-6 py-4 text-center font-semibold text-white">Corporativo</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.02] transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-3.5 text-muted-foreground">{row.name}</td>
                    <td className="px-6 py-3.5 text-center text-muted-foreground">{row.emprendedor}</td>
                    <td className="px-6 py-3.5 text-center text-white bg-indigo-500/5 font-medium">
                      {row.negocio}
                    </td>
                    <td className="px-6 py-3.5 text-center text-muted-foreground">{row.corporativo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* ==================== TESTIMONIALS ==================== */}
      <section id="testimonios" className="relative py-24 sm:py-32 bg-[#0f0f2e]/30">
        <div className="cosmic-orb cosmic-orb-1" style={{ opacity: 0.4 }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              Testimonios
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Empresas guatemaltecas{" "}
              <span className="text-gradient">confían en nosotros</span>
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass rounded-xl p-6 transition-all duration-300 hover:border-indigo-500/20"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20">
                    {testimonial.name.replace(/^(\w)\w*\s(\w)\w*/, "$1$2")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FAQ ==================== */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
              FAQ
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Preguntas <span className="text-gradient">frecuentes</span>
            </h2>
          </motion.div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-white">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-indigo-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-sm leading-relaxed text-muted-foreground border-t border-white/[0.04] pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA FINAL ==================== */}
      <section id="contacto" className="relative py-24 sm:py-32 overflow-hidden">
        <div className="cosmic-bg absolute inset-0" />
        <div className="cosmic-grid" />
        <div className="cosmic-orb cosmic-orb-1" />
        <div className="cosmic-orb cosmic-orb-2" />
        <div className="cosmic-orb cosmic-orb-3" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-10 sm:p-16 border-indigo-500/20 glow-border"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              ¿Listo para llevar tu inventario{" "}
              <span className="text-gradient-hero glow-text">al siguiente nivel</span>
              ?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Únete a más de 1,000 empresas guatemaltecas que ya transformaron
              su gestión de inventario con InvenPro. Comienza hoy sin compromiso.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 text-lg font-semibold shadow-xl shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 group"
                >
                  Comenzar Prueba Gratis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/10 text-lg hover:bg-white/5"
                >
                  Iniciar Sesión
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-green-400" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-400" />
                14 días gratis
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                Soporte en español
              </span>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <a
                href="https://wa.me/50258303182"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp: 58303182
              </a>
              <a
                href="mailto:totalappgt@gmail.com"
                className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-sm text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
              >
                <Mail className="h-4 w-4" />
                totalappgt@gmail.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="border-t border-white/[0.04] bg-[#0f0f2e]/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
                  <Boxes className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-lg font-bold tracking-tight">
                    Inven<span className="text-indigo-400">Pro</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5">by TotalAppGT</span>
                </div>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
                Sistema de gestión de inventario multi-tenant líder en Guatemala.
                Desarrollado por TotalAppGT para ayudar a empresas guatemaltecas
                a profesionalizar el control de su inventario con tecnología avanzada.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                  <Globe className="h-3 w-3" />
                  Hecho con orgullo en Guatemala
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp: 58303182
                </span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Email: totalappgt@gmail.com
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Producto</h3>
              <ul className="space-y-2.5">
                {[
                  { label: "Funcionalidades", href: "#funcionalidades" },
                  { label: "Precios", href: "#precios" },
                  { label: "Testimonios", href: "#testimonios" },
                  { label: "Registrarse", href: "/register" },
                  { label: "Iniciar Sesión", href: "/login" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground transition-colors hover:text-white">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Compañía</h3>
              <ul className="space-y-2.5">
                <li><Link href="/contacto" className="text-sm text-muted-foreground transition-colors hover:text-white">Contacto</Link></li>
                <li><a href="https://wa.me/50258303182" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-white">WhatsApp</a></li>
                <li><a href="mailto:totalappgt@gmail.com" className="text-sm text-muted-foreground transition-colors hover:text-white">Email</a></li>
                <li><span className="text-sm text-muted-foreground">Guatemala, C.A.</span></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2.5">
                <li><Link href="/terminos" className="text-sm text-muted-foreground transition-colors hover:text-white">Términos de Servicio</Link></li>
                <li><Link href="/privacidad" className="text-sm text-muted-foreground transition-colors hover:text-white">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-6 border-t border-white/[0.04] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} TotalAppGT — InvenPro. Todos los derechos reservados.
            </p>
            <p className="text-sm text-muted-foreground">
              Hecho con &hearts; en Guatemala
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
