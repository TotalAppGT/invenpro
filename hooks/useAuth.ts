"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useAuth as useBaseAuth,
  type AuthUser,
  type TenantInfo,
} from "@/components/providers";
import type { Permission } from "@/lib/permissions";
import { can as checkCan } from "@/lib/permissions";
import type { Rol } from "@prisma/client";

export type { AuthUser, TenantInfo };
export type { Rol, Permission };

export function useAuth() {
  const router = useRouter();
  const base = useBaseAuth();

  const isSuperAdmin = useMemo(() => {
    return base.user?.email === "totalappgt@gmail.com" && base.user?.rol === "ADMIN";
  }, [base.user]);

  const hasRole = useCallback(
    (role: Rol | Rol[]): boolean => {
      if (!base.user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(base.user.rol);
    },
    [base.user]
  );

  const can = useCallback(
    (action: Permission): boolean => {
      if (!base.user) return false;
      if (isSuperAdmin) return true;
      return checkCan(base.user.rol, action);
    },
    [base.user, isSuperAdmin]
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    await base.logout();

    router.push("/login");
  }, [base.logout, router]);

  return {
    user: base.user,
    loading: base.loading,
    tenant: base.tenant,
    isAdmin: base.isAdmin,
    isSupervisor: base.isSupervisor,
    isSuperAdmin,
    hasRole,
    can,
    signOut,
    refreshToken: base.refreshToken,
  };
}
