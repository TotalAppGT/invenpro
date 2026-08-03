"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Boxes,
  ArrowLeft,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  Send,
  Check,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    empresa: "",
    mensaje: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
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
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </nav>

      <div className="pt-16">
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
                <Users className="mr-1 h-3 w-3" /> Contacto
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Estamos aqui para{" "}
                <span className="text-gradient-hero">ayudarte</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Tienes preguntas sobre InvenPro? Necesitas una demo personalizada?
                Contactanos y te responderemos lo antes posible.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-2 space-y-6"
              >
                <div className="glass rounded-2xl p-8 border-indigo-500/10">
                  <h2 className="text-xl font-bold text-white mb-6">Informacion de Contacto</h2>
                  <div className="space-y-6">
                    <a
                      href="https://wa.me/50258303182"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-4 group p-4 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/20 group-hover:scale-105 transition-transform">
                        <MessageCircle className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">WhatsApp</p>
                        <p className="text-green-400 font-medium">+502 58303182</p>
                        <p className="text-xs text-muted-foreground mt-1">Respuesta en menos de 2 horas</p>
                      </div>
                    </a>

                    <a
                      href="mailto:totalappgt@gmail.com"
                      className="flex items-start gap-4 group p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 group-hover:scale-105 transition-transform">
                        <Mail className="h-6 w-6 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Email</p>
                        <p className="text-indigo-400 font-medium">totalappgt@gmail.com</p>
                        <p className="text-xs text-muted-foreground mt-1">Respondemos en menos de 24 horas</p>
                      </div>
                    </a>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                        <MapPin className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Ubicacion</p>
                        <p className="text-muted-foreground">Guatemala, Guatemala, C.A.</p>
                        <p className="text-xs text-muted-foreground mt-1">100% remoto con presencia local</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/20">
                        <Clock className="h-6 w-6 text-sky-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Horario de Atencion</p>
                        <p className="text-muted-foreground">Lunes a Viernes: 8:00 AM - 6:00 PM</p>
                        <p className="text-muted-foreground">Sabado: 9:00 AM - 1:00 PM</p>
                        <p className="text-xs text-muted-foreground mt-1">Soporte de emergencia 24/7 para planes Corporativos</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-8 border-indigo-500/10">
                  <h2 className="text-xl font-bold text-white mb-6">TotalAppGT</h2>
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Somos una empresa guatemalteca dedicada al desarrollo de software empresarial
                      de clase mundial. InvenPro es nuestro producto principal, disenado para ayudar
                      a empresas guatemaltecas a profesionalizar su gestion de inventario.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                        <MessageCircle className="h-3 w-3" />
                        58303182
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                        <Mail className="h-3 w-3" />
                        totalappgt@gmail.com
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="lg:col-span-3"
              >
                <div className="glass rounded-2xl p-8 border-indigo-500/10">
                  <h2 className="text-xl font-bold text-white mb-2">Envia un mensaje</h2>
                  <p className="text-sm text-muted-foreground mb-8">
                    Completa el formulario y te contactaremos a la brevedad posible.
                  </p>

                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-6">
                        <Check className="h-8 w-8 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Mensaje enviado con exito</h3>
                      <p className="text-muted-foreground">
                        Gracias por contactarnos. Te responderemos a la brevedad posible.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6 border-white/10 hover:bg-white/5"
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ nombre: "", email: "", empresa: "", mensaje: "" });
                        }}
                      >
                        Enviar otro mensaje
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="nombre" className="block text-sm font-medium text-white mb-2">
                            Nombre completo *
                          </label>
                          <input
                            type="text"
                            id="nombre"
                            name="nombre"
                            required
                            value={formData.nombre}
                            onChange={handleChange}
                            placeholder="Tu nombre"
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                            Correo electronico *
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="tu@email.com"
                            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="empresa" className="block text-sm font-medium text-white mb-2">
                          Empresa
                        </label>
                        <input
                          type="text"
                          id="empresa"
                          name="empresa"
                          value={formData.empresa}
                          onChange={handleChange}
                          placeholder="Nombre de tu empresa"
                          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label htmlFor="mensaje" className="block text-sm font-medium text-white mb-2">
                          Mensaje *
                        </label>
                        <textarea
                          id="mensaje"
                          name="mensaje"
                          required
                          rows={6}
                          value={formData.mensaje}
                          onChange={handleChange}
                          placeholder="Cuentanos como podemos ayudarte..."
                          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-colors resize-none"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Mensaje
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>

                <div className="mt-6 glass rounded-2xl p-6 border-white/[0.04]">
                  <div className="aspect-video rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center overflow-hidden">
                    <div className="text-center">
                      <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Guatemala, Centroamerica</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/[0.04] bg-[#0f0f2e]/30 mt-8">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TotalAppGT — InvenPro. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
