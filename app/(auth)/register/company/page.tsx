"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { tenantSchema, type TenantInput } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Globe,
  Boxes,
  ArrowRight,
  Check,
  ChevronLeft,
} from "lucide-react";

const plans = [
  {
    value: "EMPRENDEDOR",
    name: "Emprendedor",
    price: "Q149",
    period: "/mes",
    desc: "Perfecto para pequeños negocios",
    features: ["3 usuarios", "2 bodegas", "500 productos"],
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/20",
  },
  {
    value: "NEGOCIO",
    name: "Negocio",
    price: "Q449",
    period: "/mes",
    desc: "Ideal para empresas en crecimiento",
    features: ["10 usuarios", "10 bodegas", "Ilimitado productos"],
    color: "from-indigo-500/20 to-violet-600/10 border-indigo-500/30",
    popular: true,
  },
  {
    value: "CORPORATIVO",
    name: "Corporativo",
    price: "Q999",
    period: "/mes",
    desc: "Para grandes corporaciones",
    features: ["Ilimitado todo", "API + White Label", "SLA garantizado"],
    color: "from-purple-500/20 to-pink-600/10 border-purple-500/20",
  },
];

interface RegisterSessionData {
  email: string;
  password: string;
  nombre: string;
  empresa: string;
  telefono: string;
}

const companySizes = [
  "1-5 empleados",
  "6-20 empleados",
  "21-50 empleados",
  "51-200 empleados",
  "201+ empleados",
];

const industries = [
  "Retail / Comercio",
  "Distribución",
  "Manufactura",
  "Alimentos y Bebidas",
  "Farmacéutica",
  "Tecnología",
  "Construcción",
  "Logística",
  "Agroindustria",
  "Otro",
];

export default function CompanySetupPage() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<RegisterSessionData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("NEGOCIO");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      plan: "NEGOCIO",
    },
  });

  const companyName = watch("name");

  const generateAndSetSlug = useCallback(
    (name: string) => {
      const slug = generateSlug(name);
      setValue("slug", slug, { shouldValidate: true });
    },
    [setValue]
  );

  useEffect(() => {
    const stored = sessionStorage.getItem("invenpro_register");
    if (!stored) {
      toast.error("Sesión expirada. Por favor regístrate nuevamente.");
      router.push("/register");
      return;
    }
    try {
      const data = JSON.parse(stored) as RegisterSessionData;
      setSessionData(data);
      setValue("name", data.empresa);
      generateAndSetSlug(data.empresa);
    } catch {
      toast.error("Error al recuperar datos de registro");
      router.push("/register");
    }
  }, [router, setValue, generateAndSetSlug]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    generateAndSetSlug(name);
  };

  const onSubmit = async (data: TenantInput) => {
    if (!sessionData) return;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sessionData.email,
          password: sessionData.password,
          nombre: sessionData.nombre,
          companyName: data.name,
          plan: selectedPlan,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear la empresa");
      }

      sessionStorage.removeItem("invenpro_register");
      toast.success("¡Empresa creada exitosamente! Redirigiendo...");
      router.push("/dashboard");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Error al crear la empresa");
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/register"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver al registro
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 shadow-2xl shadow-indigo-500/5"
      >
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-400">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
              2
            </span>
            PASO 2 DE 2
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Configura tu Empresa
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Completa los datos de tu empresa para comenzar
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              Nombre de la Empresa
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="name"
                type="text"
                placeholder="Nombre de tu empresa"
                {...register("name", { onChange: handleNameChange })}
                className={cn(
                  "w-full rounded-lg border bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-muted-foreground/50 transition-colors",
                  "focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30",
                  errors.name
                    ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                    : "border-white/[0.06]"
                )}
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="slug"
              className="mb-1.5 block text-sm font-medium text-muted-foreground"
            >
              URL de tu empresa
            </label>
            <div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-1 border-r border-white/[0.06] px-3 py-2.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">invenpro.app/</span>
              </div>
              <input
                id="slug"
                type="text"
                placeholder="mi-empresa"
                {...register("slug")}
                className={cn(
                  "flex-1 bg-transparent py-2.5 pl-2 pr-4 text-sm text-white placeholder:text-muted-foreground/50 outline-none"
                )}
              />
            </div>
            {errors.slug && (
              <p className="mt-1 text-xs text-red-400">{errors.slug.message}</p>
            )}
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-muted-foreground">
              Selecciona tu Plan
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {plans.map((plan) => (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan.value);
                    setValue("plan", plan.value as "EMPRENDEDOR" | "NEGOCIO" | "CORPORATIVO", {
                      shouldValidate: true,
                    });
                  }}
                  className={cn(
                    "relative rounded-xl border bg-gradient-to-br p-4 text-left transition-all duration-200",
                    plan.color,
                    selectedPlan === plan.value
                      ? "ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/10"
                      : "hover:border-white/10"
                  )}
                >
                  {plan.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      POPULAR
                    </span>
                  )}
                  <p className="text-sm font-semibold text-white">{plan.name}</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {plan.price}
                    <span className="text-xs font-normal text-muted-foreground">
                      {plan.period}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {plan.desc}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                      >
                        <Check className="h-3 w-3 text-indigo-400" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  {selectedPlan === plan.value && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-indigo-400">
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                      Seleccionado
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700"
          >
            Crear mi Empresa
            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Al crear tu empresa aceptas nuestros{" "}
            <Link href="#" className="text-indigo-400 hover:text-indigo-300">
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="#" className="text-indigo-400 hover:text-indigo-300">
              Política de Privacidad
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
