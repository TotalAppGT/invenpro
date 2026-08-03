"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers";
import { getInitials } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard, Package, Warehouse, ClipboardList, Tags,
  ArrowLeftRight, BookOpen, CheckSquare, Barcode, Truck,
  BarChart3, Users, Settings, CreditCard, Bell, ShoppingCart,
  ChevronDown, ChevronRight, X, Boxes, TrendingUp,
} from "lucide-react";

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  adminOnly?: boolean;
  supervisorOnly?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  adminOnly?: boolean;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAdmin, isSupervisor } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  const navGroups: NavGroup[] = useMemo(() => [
    {
      label: "PRINCIPAL",
      icon: <LayoutDashboard className="h-4 w-4" />,
      items: [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      ],
    },
    {
      label: "INVENTARIO",
      icon: <Boxes className="h-4 w-4" />,
      items: [
        { label: "Productos", href: "/productos", icon: <Package className="h-4 w-4" /> },
        { label: "Bodegas", href: "/bodegas", icon: <Warehouse className="h-4 w-4" /> },
        { label: "Inventario", href: "/inventario", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Categorias", href: "/productos?tab=categorias", icon: <Tags className="h-4 w-4" /> },
      ],
    },
    {
      label: "MOVIMIENTOS",
      icon: <ArrowLeftRight className="h-4 w-4" />,
      items: [
        { label: "Movimientos", href: "/movimientos", icon: <ArrowLeftRight className="h-4 w-4" /> },
        { label: "Kardex", href: "/kardex", icon: <BookOpen className="h-4 w-4" /> },
        { label: "Conteos", href: "/conteos", icon: <CheckSquare className="h-4 w-4" /> },
        { label: "Etiquetas", href: "/etiquetas", icon: <Barcode className="h-4 w-4" /> },
        { label: "Ordenes de Compra", href: "/ordenes-compra", icon: <ShoppingCart className="h-4 w-4" /> },
      ],
    },
    {
      label: "PROVEEDORES",
      icon: <Truck className="h-4 w-4" />,
      items: [
        { label: "Proveedores", href: "/proveedores", icon: <Truck className="h-4 w-4" /> },
      ],
    },
    {
      label: "REPORTES",
      icon: <BarChart3 className="h-4 w-4" />,
      items: [
        { label: "Reportes", href: "/reportes", icon: <BarChart3 className="h-4 w-4" /> },
      ],
    },
    {
      label: "ADMIN",
      icon: <Settings className="h-4 w-4" />,
      supervisorOnly: true,
      items: [
        { label: "Usuarios", href: "/usuarios", icon: <Users className="h-4 w-4" /> },
        { label: "Alertas", href: "/alertas", icon: <Bell className="h-4 w-4" /> },
        { label: "Configuracion", href: "/configuracion", icon: <Settings className="h-4 w-4" /> },
        { label: "Suscripcion", href: "/suscripcion", icon: <CreditCard className="h-4 w-4" /> },
      ],
    },
  ], []);

  const filteredGroups = useMemo(() =>
    navGroups.filter((g) => {
      if (g.adminOnly && !isAdmin) return false;
      if (g.supervisorOnly && !isSupervisor) return false;
      return true;
    }), [navGroups, isAdmin, isSupervisor]);

  const isActive = useCallback((href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.includes("?")) {
      const base = href.split("?")[0];
      return pathname.startsWith(base);
    }
    return pathname.startsWith(href);
  }, [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-white/5 px-4">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onMobileClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight text-white">
              Inven<span className="text-indigo-400">Pro</span>
            </span>
            <span className="text-[10px] text-white/40">Gestion de Inventario</span>
          </div>
        </Link>
        <button
          onClick={onMobileClose}
          className="ml-auto rounded-md p-1 text-white/40 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className="space-y-1 px-3">
          {filteredGroups.map((group) => {
            const isGroupCollapsed = collapsed[group.label] ?? false;
            return (
              <div key={group.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-semibold tracking-widest text-white/30 transition-colors hover:text-white/50"
                >
                  {isGroupCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {group.label}
                </button>
                <AnimatePresence initial={false}>
                  {!isGroupCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 space-y-0.5">
                        {group.items.map((item) => {
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={onMobileClose}
                              className={cn(
                                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                                active
                                  ? "bg-indigo-500/10 text-white"
                                  : "text-white/50 hover:bg-white/[0.03] hover:text-white"
                              )}
                            >
                              {active && (
                                <motion.div
                                  layoutId="sidebar-active-indicator"
                                  className="absolute inset-0 rounded-lg bg-gradient-to-r from-indigo-500/15 to-transparent border-l-2 border-indigo-400"
                                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                              )}
                              <span className={cn(
                                "relative z-10 flex h-4 w-4 items-center justify-center",
                                active && "text-indigo-400"
                              )}>
                                {item.icon}
                              </span>
                              <span className="relative z-10">{item.label}</span>
                              {item.badge !== undefined && (
                                <span className="relative z-10 ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-medium text-white">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      {user ? (
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-semibold text-white">
              {user.photo ? (
                <img
                  src={user.photo}
                  alt={user.nombre}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getInitials(user.nombre)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user.nombre}</p>
              <p className="truncate text-[10px] text-white/40">
                {user.rol === "ADMIN"
                  ? "Administrador"
                  : user.rol === "SUPERVISOR"
                    ? "Supervisor"
                    : user.rol === "OPERADOR"
                      ? "Operador"
                      : "Consultor"}
              </p>
              <p className="truncate text-[10px] text-white/25">{user.email}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-white/[0.04] bg-[#0a0a1a]/80 backdrop-blur-xl lg:flex">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-screen w-72 bg-[#0a0a1a] border-r border-white/[0.04] lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
