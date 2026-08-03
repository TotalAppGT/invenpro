"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Boxes, FileText, Shield, ArrowLeft, ChevronRight } from "lucide-react";

const sections = [
  { id: "aceptacion", title: "1. Aceptación de los Términos" },
  { id: "servicio", title: "2. Descripción del Servicio" },
  { id: "cuentas", title: "3. Cuentas de Usuario" },
  { id: "pagos", title: "4. Pagos y Suscripciones" },
  { id: "cancelacion", title: "5. Cancelación y Terminación" },
  { id: "datos", title: "6. Datos y Privacidad" },
  { id: "propiedad", title: "7. Propiedad Intelectual" },
  { id: "limitacion", title: "8. Limitación de Responsabilidad" },
  { id: "indemnizacion", title: "9. Indemnización" },
  { id: "ley", title: "10. Ley Aplicable y Jurisdicción" },
  { id: "modificaciones", title: "11. Modificaciones a los Términos" },
  { id: "contacto", title: "12. Información de Contacto" },
];

export default function TerminosPage() {
  const [activeSection, setActiveSection] = useState<string>("aceptacion");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;
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
              <div className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 mb-4">
                <FileText className="mr-1 h-3 w-3" /> Legal
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Términos de{" "}
                <span className="text-gradient-hero">Servicio</span>
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
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-24">
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollTo(section.id)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeSection === section.id
                          ? "bg-indigo-500/10 text-indigo-400 font-medium border border-indigo-500/20"
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
                <div id="aceptacion">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      1. Aceptación de los Términos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Al acceder y utilizar InvenPro (&quot;el Servicio&quot;), operado por
                        TotalAppGT (&quot;la Empresa&quot;, &quot;nosotros&quot;, &quot;nos&quot; o &quot;nuestro&quot;),
                        usted (&quot;el Usuario&quot;, &quot;el Cliente&quot;) acepta estar sujeto a estos
                        Términos de Servicio (&quot;Términos&quot;). Si no está de acuerdo con
                        alguna parte de estos Términos, no podrá acceder al Servicio.
                      </p>
                      <p>
                        TotalAppGT es una empresa guatemalteca dedicada al desarrollo
                        de software empresarial. Estos Términos constituyen un acuerdo
                        legalmente vinculante entre usted y TotalAppGT.
                      </p>
                      <p>
                        El uso de InvenPro implica que usted ha leído, comprendido y
                        aceptado estos Términos en su totalidad. Le recomendamos
                        leerlos detenidamente antes de utilizar nuestros servicios.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div id="servicio">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      2. Descripción del Servicio
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        InvenPro es una plataforma SaaS (Software as a Service) de
                        gestión de inventario empresarial que opera 100% en la nube.
                        El Servicio incluye funcionalidades de control de inventario
                        multi-bodega, kardex valorizado, conteos físicos, generación
                        de códigos de barras, órdenes de compra, alertas inteligentes,
                        reportería avanzada, y demás funcionalidades descritas en
                        nuestro sitio web y documentación.
                      </p>
                      <p>
                        TotalAppGT se reserva el derecho de modificar, actualizar o
                        descontinuar cualquier funcionalidad del Servicio en cualquier
                        momento, notificando a los usuarios con anticipación razonable
                        cuando dichos cambios sean sustanciales.
                      </p>
                      <p>
                        El Servicio se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;.
                        Si bien nos esforzamos por mantener una disponibilidad del
                        99.9%, no garantizamos que el Servicio esté libre de
                        interrupciones o errores en todo momento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 3 */}
                <div id="cuentas">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      3. Cuentas de Usuario
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Para utilizar InvenPro, debe crear una cuenta proporcionando
                        información veraz, precisa y completa. Usted es responsable
                        de mantener la confidencialidad de sus credenciales de acceso
                        y de todas las actividades que ocurran bajo su cuenta.
                      </p>
                      <p>
                        Cada cuenta es para uso exclusivo de la empresa titular.
                        No está permitido compartir credenciales entre empresas no
                        relacionadas. Cada plan incluye un número máximo de usuarios
                        simultáneos según lo contratado.
                      </p>
                      <p>
                        Usted se compromete a notificarnos inmediatamente sobre
                        cualquier uso no autorizado de su cuenta o cualquier otra
                        violación de seguridad. TotalAppGT no será responsable de
                        pérdidas o daños derivados del incumplimiento de esta
                        obligación.
                      </p>
                      <p>
                        Nos reservamos el derecho de suspender o cancelar cuentas
                        que proporcionen información falsa, incurran en actividades
                        fraudulentas o violen estos Términos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4 */}
                <div id="pagos">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      4. Pagos y Suscripciones
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        InvenPro ofrece planes de suscripción mensual y anual. Los
                        precios están publicados en nuestro sitio web y se expresan
                        en Quetzales (GTQ), la moneda oficial de Guatemala. Los
                        precios pueden estar sujetos a impuestos aplicables.
                      </p>
                      <p>
                        Las suscripciones se renuevan automáticamente al final de
                        cada período (mensual o anual), a menos que el cliente cancele
                        la suscripción antes de la fecha de renovación. El cargo se
                        realizará utilizando el método de pago registrado.
                      </p>
                      <p>
                        Las suscripciones anuales ofrecen un descuento del 20% sobre
                        el precio mensual equivalente. Al contratar un plan anual, el
                        cliente se compromete al pago completo del período contratado.
                      </p>
                      <p>
                        En caso de impago, el acceso al Servicio podrá ser suspendido
                        después de un período de gracia de 7 días calendario. Los
                        datos del cliente se conservarán por un período adicional de
                        90 días para facilitar la reactivación.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 5 */}
                <div id="cancelacion">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      5. Cancelación y Terminación
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Usted puede cancelar su suscripción en cualquier momento
                        desde el panel de administración de su cuenta. La cancelación
                        será efectiva al final del período de facturación actual.
                        No se realizan reembolsos por períodos parcialmente utilizados,
                        excepto en los casos previstos por la ley guatemalteca.
                      </p>
                      <p>
                        TotalAppGT se reserva el derecho de terminar o suspender
                        el acceso al Servicio de forma inmediata, sin previo aviso,
                        en caso de violación sustancial de estos Términos, incluyendo
                        pero no limitado a: uso fraudulento, actividades ilícitas,
                        impago reiterado o cualquier conducta que pueda perjudicar
                        la integridad del Servicio o de otros usuarios.
                      </p>
                      <p>
                        Al cancelar su cuenta, usted podrá exportar sus datos durante
                        los 30 días posteriores a la cancelación. Transcurrido ese
                        plazo, sus datos serán eliminados de nuestros servidores de
                        acuerdo con nuestra Política de Privacidad.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 6 */}
                <div id="datos">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      6. Datos y Privacidad
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        La protección de sus datos es fundamental para nosotros.
                        Todos los datos que usted ingresa en InvenPro —incluyendo
                        información de productos, inventario, movimientos, usuarios
                        y configuración de su empresa— son de su exclusiva propiedad.
                      </p>
                      <p>
                        TotalAppGT no reclama ningún derecho de propiedad sobre los
                        datos de su empresa. No compartimos, vendemos ni alquilamos
                        sus datos a terceros, excepto en las circunstancias descritas
                        en nuestra Política de Privacidad.
                      </p>
                      <p>
                        El tratamiento de datos personales se rige por nuestra
                        Política de Privacidad, la cual forma parte integral de estos
                        Términos. Le recomendamos leerla detenidamente para entender
                        cómo recopilamos, usamos y protegemos su información.
                      </p>
                      <p>
                        Usted es responsable de garantizar que cuenta con las
                        autorizaciones necesarias para los datos que ingresa en
                        la plataforma, particularmente en lo que respecta a datos
                        personales de empleados o terceros.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 7 */}
                <div id="propiedad">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      7. Propiedad Intelectual
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        InvenPro, su código fuente, diseño, logo, marca, interfaz
                        de usuario, documentación y todos los elementos que componen
                        la plataforma son propiedad exclusiva de TotalAppGT y están
                        protegidos por las leyes de propiedad intelectual de Guatemala
                        y tratados internacionales.
                      </p>
                      <p>
                        La contratación de una suscripción a InvenPro le otorga una
                        licencia limitada, no exclusiva, no transferible y revocable
                        para utilizar el Servicio de acuerdo con estos Términos. Esta
                        licencia no le confiere ningún derecho de propiedad sobre
                        el software o cualquiera de sus componentes.
                      </p>
                      <p>
                        Queda expresamente prohibido: copiar, modificar, distribuir,
                        vender, alquilar, realizar ingeniería inversa, descompilar
                        o intentar extraer el código fuente del Servicio, total o
                        parcialmente.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 8 */}
                <div id="limitacion">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      8. Limitación de Responsabilidad
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        En la máxima medida permitida por la ley aplicable, TotalAppGT
                        no será responsable por daños indirectos, incidentales,
                        especiales, consecuentes o punitivos, incluyendo pero no
                        limitado a pérdida de beneficios, datos, uso, fondo de
                        comercio u otras pérdidas intangibles.
                      </p>
                      <p>
                        La responsabilidad total de TotalAppGT por cualquier
                        reclamación relacionada con el Servicio no excederá el
                        monto total pagado por el cliente durante los doce (12)
                        meses anteriores al evento que dio lugar a la reclamación.
                      </p>
                      <p>
                        TotalAppGT no garantiza que el Servicio satisfaga todos
                        los requisitos específicos del cliente, que sea completamente
                        ininterrumpido, oportuno, seguro o libre de errores. El
                        cliente es responsable de verificar que el Servicio sea
                        adecuado para sus necesidades.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 9 */}
                <div id="indemnizacion">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      9. Indemnización
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Usted acepta indemnizar, defender y eximir de responsabilidad
                        a TotalAppGT, sus directores, empleados, contratistas y
                        afiliados de cualquier reclamación, demanda, daño, pérdida,
                        costo o gasto (incluyendo honorarios razonables de abogados)
                        que surja de:
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>Su uso del Servicio.</li>
                        <li>La violación de estos Términos.</li>
                        <li>La violación de derechos de terceros.</li>
                        <li>El contenido o datos que usted ingrese en la plataforma.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Section 10 */}
                <div id="ley">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      10. Ley Aplicable y Jurisdicción
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Estos Términos se regirán e interpretarán de conformidad con
                        las leyes de la República de Guatemala, sin tener en cuenta
                        sus disposiciones sobre conflicto de leyes.
                      </p>
                      <p>
                        Cualquier disputa, controversia o reclamación que surja de
                        o en relación con estos Términos, incluyendo su validez,
                        interpretación, cumplimiento o terminación, será sometida a
                        la jurisdicción exclusiva de los tribunales competentes de la
                        Ciudad de Guatemala, renunciando las partes a cualquier otro
                        fuero que pudiera corresponderles.
                      </p>
                      <p>
                        En caso de que alguna disposición de estos Términos sea
                        considerada inválida o inaplicable por un tribunal competente,
                        dicha disposición se modificará en la medida necesaria para
                        hacerla válida y aplicable, y las disposiciones restantes
                        permanecerán en pleno vigor y efecto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 11 */}
                <div id="modificaciones">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      11. Modificaciones a los Términos
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        TotalAppGT se reserva el derecho de modificar estos Términos
                        en cualquier momento. Las modificaciones entrarán en vigor
                        en la fecha de su publicación en esta página.
                      </p>
                      <p>
                        Para cambios sustanciales, notificaremos a los usuarios
                        activos por correo electrónico con al menos 30 días de
                        anticipación. El uso continuado del Servicio después de la
                        entrada en vigor de los nuevos Términos constituye la
                        aceptación de los mismos.
                      </p>
                      <p>
                        Si usted no está de acuerdo con los nuevos Términos, deberá
                        cancelar su cuenta y dejar de utilizar el Servicio antes de
                        la fecha de entrada en vigor de las modificaciones.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 12 */}
                <div id="contacto">
                  <div className="glass rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      12. Información de Contacto
                    </h2>
                    <div className="space-y-4 text-muted-foreground leading-relaxed">
                      <p>
                        Para cualquier consulta, duda o reclamación relacionada con
                        estos Términos de Servicio, puede contactarnos a través de
                        los siguientes medios:
                      </p>
                      <div className="space-y-3 mt-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">Email</p>
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

                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-white">Ubicación</p>
                            <p>Guatemala, Guatemala, C.A.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-16 p-6 glass rounded-2xl border border-white/[0.04] text-center">
                <Shield className="mx-auto h-8 w-8 text-indigo-400 mb-3" />
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} TotalAppGT. Todos los derechos reservados.
                  InvenPro es una marca registrada de TotalAppGT.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
