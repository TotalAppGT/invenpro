"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Boxes, Shield, Lock, ArrowLeft, ChevronRight, Eye, Server, Cookie, Trash2, Download } from "lucide-react";

const sections = [
  { id: "introduccion", title: "1. Introducción", icon: Shield },
  { id: "datos-recopilados", title: "2. Datos que Recopilamos", icon: Eye },
  { id: "uso-datos", title: "3. Cómo Usamos sus Datos", icon: Server },
  { id: "almacenamiento", title: "4. Almacenamiento de Datos", icon: Lock },
  { id: "compartir", title: "5. Compartición de Datos", icon: Shield },
  { id: "derechos", title: "6. Sus Derechos como Usuario", icon: Download },
  { id: "cookies", title: "7. Uso de Cookies", icon: Cookie },
  { id: "seguridad", title: "8. Medidas de Seguridad", icon: Lock },
  { id: "terceros", title: "9. Servicios de Terceros", icon: Server },
  { id: "contacto-privacidad", title: "10. Contacto sobre Privacidad", icon: Shield },
];

export default function PrivacidadPage() {
  const [activeSection, setActiveSection] = useState<string>("introduccion");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.04] bg-[#0a0a1a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Inven<span className="text-indigo-400">Pro</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="pt-16">
        {/* Header */}
        <section className="cosmic-bg relative py-20 overflow-hidden">
          <div className="cosmic-grid" />
          <div className="cosmic-orb cosmic-orb-1" style={{ opacity: 0.5 }} />
          <div className="cosmic-orb cosmic-orb-3" style={{ opacity: 0.4 }} />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <div className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400 mb-4">
                <Shield className="mr-1 h-3 w-3" /> Privacidad
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Política de{" "}
                <span className="text-gradient-hero">Privacidad</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Última actualización: 1 de agosto de 2026
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex gap-10">
            {/* Sidebar Navigation */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? "bg-green-500/10 text-green-400 font-medium border border-green-500/20"
                          : "text-muted-foreground hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <ChevronRight
                        className={`h-3 w-3 shrink-0 transition-transform ${
                          activeSection === section.id ? "rotate-90" : ""
                        }`}
                      />
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 max-w-3xl"
            >
              <div className="space-y-16">
                {/* Section 1 */}
                <div id="introduccion">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      1. Introducción
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        En TotalAppGT, valoramos y respetamos su privacidad. Esta
                        Política de Privacidad describe cómo recopilamos, utilizamos,
                        almacenamos y protegemos la información personal que nos
                        proporciona al utilizar InvenPro (&quot;el Servicio&quot;).
                      </p>
                      <p>
                        TotalAppGT (&quot;nosotros&quot;, &quot;nuestro&quot;) es una empresa guatemalteca
                        comprometida con la protección de los datos de nuestros
                        clientes. Esta política cumple con las mejores prácticas
                        internacionales en materia de protección de datos personales.
                      </p>
                      <p>
                        Al utilizar InvenPro, usted acepta las prácticas descritas
                        en esta Política de Privacidad. Si no está de acuerdo con
                        esta política, le recomendamos no utilizar el Servicio.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div id="datos-recopilados">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      2. Datos que Recopilamos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Para proporcionar y mejorar nuestro Servicio, recopilamos
                        los siguientes tipos de información:
                      </p>
                      <div className="space-y-4 mt-4">
                        <div className="rounded-xl bg-white/[0.02] p-5 border border-white/[0.04]">
                          <h3 className="font-semibold text-white mb-2">
                            Información de Cuenta
                          </h3>
                          <ul className="space-y-2 text-sm">
                            <li>• Nombre completo del usuario administrador</li>
                            <li>• Dirección de correo electrónico</li>
                            <li>• Nombre de la empresa</li>
                            <li>• Número de teléfono (opcional)</li>
                            <li>• Contraseña (almacenada con hash encriptado)</li>
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-5 border border-white/[0.04]">
                          <h3 className="font-semibold text-white mb-2">
                            Información de la Empresa
                          </h3>
                          <ul className="space-y-2 text-sm">
                            <li>• Datos fiscales y NIT (opcional)</li>
                            <li>• Dirección y ubicación de bodegas</li>
                            <li>• Configuración de la empresa</li>
                            <li>• Usuarios registrados con sus roles y permisos</li>
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-5 border border-white/[0.04]">
                          <h3 className="font-semibold text-white mb-2">
                            Datos de Inventario
                          </h3>
                          <ul className="space-y-2 text-sm">
                            <li>• Catálogo de productos (nombres, SKU, precios, costos)</li>
                            <li>• Movimientos de inventario (entradas, salidas, ajustes)</li>
                            <li>• Historial de kardex</li>
                            <li>• Órdenes de compra y recepción</li>
                            <li>• Conteos físicos y conciliaciones</li>
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-5 border border-white/[0.04]">
                          <h3 className="font-semibold text-white mb-2">
                            Datos Técnicos
                          </h3>
                          <ul className="space-y-2 text-sm">
                            <li>• Dirección IP</li>
                            <li>• Tipo de navegador y sistema operativo</li>
                            <li>• Registro de actividad (auditoría de operaciones)</li>
                            <li>• Datos de uso de la plataforma</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div id="uso-datos">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      3. Cómo Usamos sus Datos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Utilizamos la información recopilada exclusivamente para los
                        siguientes fines:
                      </p>
                      <ul className="space-y-3 ml-5">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Prestación del Servicio:</strong> Gestionar su cuenta, procesar sus datos de inventario y proporcionar las funcionalidades contratadas.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Comunicación:</strong> Enviar notificaciones del sistema, alertas de stock, confirmaciones de operaciones y comunicaciones relacionadas con su cuenta.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Mejora del Servicio:</strong> Analizar patrones de uso agregados y anonimizados para identificar áreas de mejora en la plataforma.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Soporte Técnico:</strong> Diagnosticar y resolver problemas técnicos que pueda experimentar con la plataforma.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Facturación:</strong> Procesar pagos, generar facturas y gestionar su suscripción.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span><strong className="text-white">Cumplimiento Legal:</strong> Cumplir con obligaciones legales y regulatorias aplicables en Guatemala.</span>
                        </li>
                      </ul>
                      <p className="mt-4">
                        No utilizamos sus datos para fines de marketing sin su
                        consentimiento explícito. No vendemos, alquilamos ni
                        compartimos su información personal con terceros para
                        fines comerciales.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4 */}
                <div id="almacenamiento">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      4. Almacenamiento de Datos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Sus datos se almacenan de forma segura utilizando una
                        combinación de tecnologías modernas:
                      </p>
                      <ul className="space-y-3 ml-5">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Firebase Auth:</strong> Gestiona la autenticación de usuarios con estándares de seguridad OAuth 2.0 y OpenID Connect. Las contraseñas se almacenan utilizando hash con salt (scrypt).</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">PostgreSQL en Railway:</strong> Almacena todos los datos transaccionales de su empresa con encriptación en reposo y en tránsito. Las bases de datos están aisladas por tenant.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Copias de Seguridad:</strong> Realizamos backups automáticos diarios con retención de 30 días. Las copias de seguridad también están encriptadas.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Encriptación:</strong> Toda la comunicación entre su navegador y nuestros servidores utiliza SSL/TLS 256-bit. Los datos sensibles se almacenan con encriptación AES-256.</span>
                        </li>
                      </ul>
                      <p className="mt-4">
                        Sus datos de inventario se conservan mientras su cuenta
                        esté activa. Tras la cancelación, sus datos se conservan
                        por 30 días para permitir la exportación y luego se
                        eliminan de forma permanente y segura de todos nuestros
                        sistemas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 5 */}
                <div id="compartir">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      5. Compartición de Datos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Su información es suya. Nuestra política de compartición
                        es clara y transparente:
                      </p>
                      <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-5 mt-4">
                        <p className="text-white font-semibold mb-2">
                          Nunca vendemos sus datos.
                        </p>
                        <p className="text-sm">
                          TotalAppGT no vende, alquila ni comercializa los datos
                          de sus clientes a terceros bajo ninguna circunstancia.
                        </p>
                      </div>
                      <p className="mt-4">Sus datos solo se comparten en las siguientes circunstancias limitadas:</p>
                      <ul className="space-y-3 ml-5 mt-2">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span><strong className="text-white">Con su consentimiento explícito:</strong> Cuando usted nos autoriza expresamente a compartir información específica.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span><strong className="text-white">Proveedores de servicios:</strong> Compartimos datos mínimos necesarios con proveedores que nos ayudan a operar el Servicio (ver sección 9). Todos están sujetos a acuerdos de confidencialidad.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span><strong className="text-white">Requerimiento legal:</strong> Cuando sea requerido por orden judicial, ley o autoridad competente en Guatemala.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 6 */}
                <div id="derechos">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      6. Sus Derechos como Usuario
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Como usuario de InvenPro, usted tiene los siguientes
                        derechos sobre sus datos personales:
                      </p>
                      <div className="grid gap-4 mt-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-white/[0.02] p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-indigo-400" />
                            <h3 className="font-semibold text-white text-sm">Acceso</h3>
                          </div>
                          <p className="text-sm">
                            Solicitar una copia de los datos personales que tenemos
                            sobre usted y su empresa.
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <h3 className="font-semibold text-white text-sm">Rectificación</h3>
                          </div>
                          <p className="text-sm">
                            Solicitar la corrección de datos inexactos o incompletos
                            en su cuenta.
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <Trash2 className="h-4 w-4 text-indigo-400" />
                            <h3 className="font-semibold text-white text-sm">Eliminación</h3>
                          </div>
                          <p className="text-sm">
                            Solicitar la eliminación de sus datos cuando ya no sean
                            necesarios para los fines que fueron recopilados.
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.02] p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2">
                            <Download className="h-4 w-4 text-indigo-400" />
                            <h3 className="font-semibold text-white text-sm">Portabilidad</h3>
                          </div>
                          <p className="text-sm">
                            Recibir sus datos en un formato estructurado y transferirlos
                            a otro proveedor si lo desea.
                          </p>
                        </div>
                      </div>
                      <p className="mt-4">
                        Para ejercer cualquiera de estos derechos, contáctenos a
                        través de los medios indicados en la sección 10. Responderemos
                        a su solicitud en un plazo máximo de 30 días hábiles.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 7 */}
                <div id="cookies">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      7. Uso de Cookies
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        InvenPro utiliza cookies y tecnologías similares de
                        almacenamiento local para mejorar su experiencia de uso:
                      </p>
                      <ul className="space-y-3 ml-5">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Cookies esenciales:</strong> Necesarias para el funcionamiento de la plataforma, como mantener su sesión activa. No pueden desactivarse.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Cookies de preferencias:</strong> Recuerdan sus configuraciones, como el tema oscuro/claro y el idioma.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                          <span><strong className="text-white">Cookies de análisis:</strong> Nos ayudan a entender cómo se utiliza la plataforma para mejorarla (datos anonimizados).</span>
                        </li>
                      </ul>
                      <p className="mt-4">
                        Usted puede configurar su navegador para rechazar cookies,
                        sin embargo, esto puede afectar la funcionalidad de la
                        plataforma. No utilizamos cookies de publicidad ni de
                        seguimiento de terceros.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 8 */}
                <div id="seguridad">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      8. Medidas de Seguridad
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Implementamos medidas de seguridad de nivel bancario para
                        proteger su información:
                      </p>
                      <ul className="space-y-3 ml-5">
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Encriptación SSL/TLS 256-bit para todas las comunicaciones</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Encriptación AES-256 para datos en reposo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Autenticación de dos factores (2FA) disponible para todas las cuentas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Monitoreo continuo de actividad sospechosa</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Acceso restringido al personal con necesidad operativa</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Auditorías de seguridad periódicas</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" />
                          <span>Copias de seguridad automáticas diarias y semanales</span>
                        </li>
                      </ul>
                      <p className="mt-4">
                        A pesar de nuestras medidas, ningún sistema es 100% seguro.
                        En caso de detectar una vulnerabilidad o incidente de
                        seguridad, notificaremos a los usuarios afectados dentro
                        de las 72 horas siguientes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 9 */}
                <div id="terceros">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      9. Servicios de Terceros
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Para operar InvenPro, utilizamos los siguientes servicios
                        de terceros que pueden procesar ciertos datos:
                      </p>
                      <div className="space-y-4 mt-4">
                        <div className="glass rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                              <Server className="h-4 w-4 text-amber-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">Firebase (Google Cloud)</h3>
                              <p className="text-xs text-muted-foreground">Autenticación de usuarios</p>
                            </div>
                          </div>
                          <p className="text-sm">
                            Firebase Auth gestiona el registro e inicio de sesión.
                            Datos procesados: email, contraseña (hash). Los datos se
                            almacenan en servidores de Google Cloud con encriptación.
                          </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                              <Server className="h-4 w-4 text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">Railway</h3>
                              <p className="text-xs text-muted-foreground">Base de datos PostgreSQL</p>
                            </div>
                          </div>
                          <p className="text-sm">
                            Railway proporciona la infraestructura de base de datos.
                            Todos los datos transaccionales de su empresa se almacenan
                            en PostgreSQL con encriptación en reposo y en tránsito.
                          </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                              <Server className="h-4 w-4 text-violet-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">Recurrente</h3>
                              <p className="text-xs text-muted-foreground">Procesamiento de pagos</p>
                            </div>
                          </div>
                          <p className="text-sm">
                            Recurrente procesa los pagos de suscripción. Datos procesados:
                            información de pago, email, nombre. Recurrente cumple con PCI-DSS
                            Nivel 1. InvenPro nunca almacena datos completos de tarjetas.
                          </p>
                        </div>
                        <div className="glass rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
                              <Server className="h-4 w-4 text-sky-400" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white text-sm">Resend</h3>
                              <p className="text-xs text-muted-foreground">Envío de correos electrónicos</p>
                            </div>
                          </div>
                          <p className="text-sm">
                            Resend se utiliza para enviar correos transaccionales
                            (verificación de cuenta, notificaciones, alertas). Datos
                            procesados: email del destinatario, contenido del mensaje.
                          </p>
                        </div>
                      </div>
                      <p className="mt-4">
                        Todos nuestros proveedores de servicios están sujetos a
                        acuerdos de procesamiento de datos que garantizan la
                        protección de su información de acuerdo con esta política.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 10 */}
                <div id="contacto-privacidad">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      10. Contacto sobre Privacidad
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Si tiene preguntas, inquietudes o desea ejercer sus derechos
                        sobre sus datos personales, no dude en contactarnos:
                      </p>
                      <div className="space-y-3 mt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">Email de Privacidad</p>
                            <a
                              href="mailto:totalappgt@gmail.com"
                              className="text-indigo-400 hover:underline"
                            >
                              totalappgt@gmail.com
                            </a>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">WhatsApp</p>
                            <a
                              href="https://wa.me/50258303182"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:underline"
                            >
                              +502 58303182
                            </a>
                          </div>
                        </div>
                      </div>
                      <p className="mt-4">
                        Nos comprometemos a responder todas las consultas relacionadas
                        con privacidad en un plazo máximo de 15 días hábiles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 p-6 glass rounded-2xl border border-white/[0.04] text-center">
                <Lock className="mx-auto h-8 w-8 text-green-400 mb-3" />
                <p className="text-sm font-medium text-white mb-1">
                  Su privacidad es nuestra prioridad
                </p>
                <p className="text-sm text-muted-foreground">
                  TotalAppGT &mdash; {new Date().getFullYear()}. Esta política puede
                  ser actualizada periódicamente. Le notificaremos sobre cambios
                  significativos por correo electrónico.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
