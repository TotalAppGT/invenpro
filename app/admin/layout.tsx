"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { getInitials, cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Search,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

const ADMIN_EMAIL = "totalappgt@gmail.com";

const adminNavItems: { label: string; href: string; icon: React.ReactNode }[] = [
  { label: "Dashboard General", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Tenants/Empresas", href: "/admin/tenants", icon: <Building2 className="h-4 w-4" /> },
  { label: "Usuarios", href: "/admin/usuarios", icon: <Users className="h-4 w-4" /> },
  { label: "Suscripciones", href: "/admin/suscripciones", icon: <CreditCard className="h-4 w-4" /> },
  { label: "Reportes Globales", href: "/admin/reportes", icon: <BarChart3 className="h-4 w-4" /> },
  { label: "Auditoría", href: "/admin/auditoria", icon: <Search className="h-4 w-4" /> },
  { label: "Configuración", href: "/admin/configuracion", icon: <Settings className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isSuperAdmin = user?.email === ADMIN_EMAIL && user?.rol === "ADMIN";

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error("Acceso denegado. Se requieren permisos de Super Administrador.");
      router.replace("/dashboard");
    }
  }, [user, loading, isSuperAdmin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#04040d]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent"
        />
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-red-500/10 px-4">
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-600 shadow-lg shadow-red-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-white">
              InvenPro <span className="text-red-400">Admin Central</span>
            </span>
            <span className="text-[10px] text-muted-foreground">Panel de Super Administrador</span>
          </div>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto rounded-md p-1 text-muted-foreground hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className="space-y-1 px-3">
          {adminNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-red-500/10 text-white"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-white"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="admin-sidebar-active"
                    className="absolute inset-0 rounded-lg border-l-2 border-red-400 bg-gradient-to-r from-red-500/15 to-transparent"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={cn("relative z-10", active && "text-red-400")}>{item.icon}</span>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {user && (
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-xs font-semibold text-white">
              {getInitials(user.nombre)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.nombre}</p>
              <p className="truncate text-[10px] text-muted-foreground">Super Admin</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#04040d]">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-red-500/5 bg-[#06061a]/90 backdrop-blur-xl lg:flex">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-screen w-72 border-r border-red-500/5 bg-[#06061a] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.02] bg-[#04040d]/70 px-4 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <span className="hidden text-xs text-red-400/60 xl:block">
            SUPER ADMIN PANEL
          </span>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
            aria-label="Cambiar tema"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white">
            <Bell className="h-4 w-4" />
          </button>

          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            Ir al Dashboard
          </Link>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/[0.05]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-xs font-semibold text-white">
                {getInitials(user?.nombre || "SA")}
              </div>
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
                    className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0a0a2a] shadow-2xl shadow-black/40"
                  >
                    <div className="border-b border-white/[0.04] p-3">
                      <p className="text-sm font-medium text-white">{user?.nombre}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <p className="mt-1 text-[10px] text-red-400">Super Administrador</p>
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

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
