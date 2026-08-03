"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers";
import { getInitials } from "@/lib/utils";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronRight,
  LogOut,
  User,
  Settings,
  CreditCard,
  Search,
} from "lucide-react";

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  productos: "Productos",
  bodegas: "Bodegas",
  inventario: "Inventario",
  categorias: "Categorías",
  movimientos: "Movimientos",
  kardex: "Kardex",
  conteos: "Conteos",
  etiquetas: "Etiquetas",
  proveedores: "Proveedores",
  reportes: "Reportes",
  usuarios: "Usuarios",
  configuracion: "Configuración",
  suscripcion: "Suscripción",
  alertas: "Alertas",
  perfil: "Perfil",
};

function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];
  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = breadcrumbMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  }
  return breadcrumbs;
}

export function Topbar({
  onMobileMenuToggle,
}: {
  onMobileMenuToggle?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAdmin, tenant } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifCount] = useState(3);

  const breadcrumbs = useMemo(() => generateBreadcrumbs(pathname), [pathname]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const currentDateTime = useMemo(() => {
    return new Intl.DateTimeFormat("es-GT", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.04] bg-[#0a0a1a]/70 px-4 backdrop-blur-xl lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="hidden items-center gap-1 text-sm sm:flex">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.href}>
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-white">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground transition-colors hover:text-white"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Date/time */}
      <span className="hidden text-xs text-muted-foreground/60 xl:block">
        {currentDateTime}
      </span>

      {/* Search button */}
      <button className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white sm:block">
        <Search className="h-4 w-4" />
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
        aria-label="Cambiar tema"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Cambiar tema</span>
      </button>

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white">
        <Bell className="h-4 w-4" />
        {notifCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {notifCount}
          </span>
        )}
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/[0.05]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.nombre}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              getInitials(user?.nombre || "U")
            )}
          </div>
          <span className="hidden text-sm font-medium text-white md:block">
            {user?.nombre}
          </span>
        </button>

        <AnimatePresence>
          {userMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0f0f2e] shadow-2xl shadow-black/40"
              >
                <div className="border-b border-white/[0.04] p-3">
                  <p className="text-sm font-medium text-white">{user?.nombre}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  {tenant && (
                    <p className="mt-1 text-[10px] text-indigo-400">{tenant.name}</p>
                  )}
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push("/perfil");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    Mi Perfil
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          router.push("/configuracion");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        <Settings className="h-4 w-4" />
                        Configuración
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          router.push("/suscripcion");
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        <CreditCard className="h-4 w-4" />
                        Suscripción
                      </button>
                    </>
                  )}
                </div>
                <div className="border-t border-white/[0.04] p-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/[0.08] hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export function MobileSidebarTriggerButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
