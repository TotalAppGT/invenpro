"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { Rol, Plan, TenantStatus } from "@prisma/client";

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: Plan;
  status: TenantStatus;
}

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  nombre: string;
  rol: Rol;
  photo: string | null;
  telefono: string | null;
  estado: string;
  tenantId: string;
  tenantInfo: TenantInfo;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  tenant: TenantInfo | null;
  isSuperAdmin: boolean;
  refreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  tenant: null,
  isSuperAdmin: false,
  refreshToken: async () => null,
  logout: async () => {},
  isAdmin: false,
  isSupervisor: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useTenant() {
  const { tenant } = useContext(AuthContext);
  return tenant;
}

async function fetchSessionUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.user) return null;
    return data.user as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessionUser()
      .then((userData) => {
        setAuthUser(userData);
      })
      .catch(() => {
        setAuthUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success) return null;
      return "valid";
    } catch {
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setAuthUser(null);
  }, []);

  const tenant: TenantInfo | null = authUser
    ? {
        id: authUser.tenantId,
        slug: authUser.tenantInfo.slug,
        name: authUser.tenantInfo.name,
        plan: authUser.tenantInfo.plan,
        status: authUser.tenantInfo.status,
      }
    : null;

  const isAdmin = authUser?.rol === "ADMIN";
  const isSupervisor = authUser?.rol === "SUPERVISOR" || authUser?.rol === "ADMIN";
  const isSuperAdmin = authUser?.email === "totalappgt@gmail.com" && authUser?.rol === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user: authUser,
        loading,
        tenant,
        isSuperAdmin,
        refreshToken,
        logout,
        isAdmin,
        isSupervisor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: "hsl(240 15% 10%)",
              border: "1px solid hsl(240 15% 20%)",
              color: "hsl(210 40% 98%)",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
