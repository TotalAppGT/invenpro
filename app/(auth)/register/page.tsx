"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Boxes,
  ArrowRight,
  Check,
  Shield,
  Zap,
  TrendingUp,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      sessionStorage.setItem(
        "invenpro_register",
        JSON.stringify({
          email: data.email,
          password: data.password,
          nombre: data.nombre,
          empresa: data.empresa,
          telefono: data.telefono || "",
        })
      );

      toast.success("¡Datos guardados! Configura tu empresa.");
      router.push("/register/company");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error al guardar los datos");
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
            Comienza tu{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Prueba Gratuita
            </span>
          </h1>

          <p className="mt-4 text-lg text-muted-foreground">
            Crea tu cuenta en segundos y descubre por qué más de 500 empresas
            guatemaltecas confían en InvenPro.
          </p>

          <div className="mt-10 space-y-1">
            {[
              "14 días de prueba gratuita",
              "Sin tarjeta de crédito",
              "Acceso completo a todas las funciones",
              "Soporte dedicado durante la prueba",
              "Cancela cuando quieras",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3 py-1.5"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-sm text-muted-foreground">{item}</span>
              </motion.div>
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

          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
                1
              </span>
              PASO 1 DE 2
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">
              Crear Cuenta
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresa tus datos para comenzar
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="nombre"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Nombre Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="nombre"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre completo"
                  {...register("nombre")}
                  className={cn(
                    "w-full rounded-lg border bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground/50 transition-colors",
                    "focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
                    errors.nombre
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-white/[0.06]"
                  )}
                />
              </div>
              {errors.nombre && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.nombre.message}
                </p>
              )}
            </div>

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
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
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

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-muted-foreground"
              >
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repite tu contraseña"
                  {...register("confirmPassword")}
                  className={cn(
                    "w-full rounded-lg border bg-white/[0.02] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-muted-foreground/50 transition-colors",
                    "focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
                    errors.confirmPassword
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-white/[0.06]"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700"
            >
              Continuar
              {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
