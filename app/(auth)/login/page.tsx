"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Boxes,
  ArrowRight,
  Shield,
  Zap,
  TrendingUp,
  Warehouse,
  BarChart3,
  BellRing,
} from "lucide-react";

const highlights = [
  {
    icon: Warehouse,
    label: "Multi-Bodega",
    desc: "Control centralizado",
  },
  {
    icon: BarChart3,
    label: "Kardex Automatizado",
    desc: "Trazabilidad completa",
  },
  {
    icon: BellRing,
    label: "Alertas Inteligentes",
    desc: "Stock bajo y vencimientos",
  },
  {
    icon: Shield,
    label: "Multi-Usuario",
    desc: "Roles y permisos",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al iniciar sesión");
      }

      toast.success("Inicio de sesión exitoso");
      router.push("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error al iniciar sesión");
      }
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl items-center gap-12">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden flex-1 lg:block"
      >
        <div className="flex flex-col items-start">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Inven<span className="text-indigo-400">Pro</span>
            </span>
          </Link>

          <h1 className="mt-12 text-4xl font-bold leading-tight">
            Gestión de{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Inventario Profesional
            </span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            La plataforma multi-tenant líder en Guatemala para el control
            total de tu inventario empresarial.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {highlights.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass flex items-start gap-3 rounded-xl p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                  <item.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-6">
            {[
              { icon: Shield, text: "Datos seguros" },
              { icon: Zap, text: "Tiempo real" },
              { icon: TrendingUp, text: "+500 empresas" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-indigo-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md mx-auto lg:mx-0"
      >
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-indigo-500/5">
          <Link
            href="/"
            className="mb-6 flex items-center justify-center gap-2 lg:hidden"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Inven<span className="text-indigo-400">Pro</span>
            </span>
          </Link>

          <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa a tu cuenta para continuar
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  {...register("email")}
                  className={cn(
                    "w-full rounded-lg border bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground/50 transition-colors",
                    "focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
                    errors.email
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-white/[0.06]"
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={cn(
                    "w-full rounded-lg border bg-white/[0.02] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-muted-foreground/50 transition-colors",
                    "focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
                    errors.password
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-white/[0.06]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/[0.06] bg-white/[0.02] text-indigo-500 focus:ring-indigo-500/30"
                />
                Recordarme
              </label>
              <Link
                href="/login/forgot-password"
                className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700"
            >
              Iniciar Sesión
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
