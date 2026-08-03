import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Rol, Plan, TenantStatus } from "@prisma/client";

export const SESSION_COOKIE_NAME = "invenpro_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SUPER_ADMIN_EMAIL = "totalappgt@gmail.com";

const ENCRYPTION_SECRET = new TextEncoder().encode(
  process.env.SESSION_ENCRYPTION_KEY || "fallback-dev-key-change-in-production-change-me-32chars"
);

export interface SessionPayload {
  uid: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantPlan: Plan;
  tenantStatus: TenantStatus;
  nombre: string;
  rol: Rol;
  photo: string | null;
  isSuperAdmin: boolean;
}

export function isSuperAdminEmail(email: string): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

export function isSuperAdminUser(session: SessionPayload): boolean {
  return session.email === SUPER_ADMIN_EMAIL && session.rol === "ADMIN";
}

export async function encrypt(payload: Record<string, unknown>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(ENCRYPTION_SECRET);
}

export async function decrypt(token: string) {
  const { payload } = await jwtVerify(token, ENCRYPTION_SECRET, {
    algorithms: ["HS256"],
  });
  return payload;
}

export async function createSession(user: {
  id: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantPlan: Plan;
  tenantStatus: TenantStatus;
  nombre: string;
  rol: Rol;
  foto: string | null;
}): Promise<string> {
  const sessionPayload: Record<string, unknown> = {
    uid: user.id,
    email: user.email,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    tenantName: user.tenantName,
    tenantPlan: user.tenantPlan,
    tenantStatus: user.tenantStatus,
    nombre: user.nombre,
    rol: user.rol,
    photo: user.foto,
    isSuperAdmin: user.email === SUPER_ADMIN_EMAIL && user.rol === "ADMIN",
  };

  const encryptedSession = await encrypt(sessionPayload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encryptedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return encryptedSession;
}

export async function getSessionFromCookie(cookieValue: string): Promise<SessionPayload | null> {
  try {
    const payload = await decrypt(cookieValue);
    if (!payload.uid || !payload.tenantId) return null;

    if (payload.email === SUPER_ADMIN_EMAIL && payload.rol === "ADMIN") {
      return payload as unknown as SessionPayload;
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.uid as string,
        tenantId: payload.tenantId as string,
        estado: "ACTIVO",
      },
    });

    if (!user) return null;

    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) return null;

    return await getSessionFromCookie(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function getCurrentTenant() {
  const session = await getServerSession();
  if (!session) return null;
  return {
    id: session.tenantId,
    slug: session.tenantSlug,
    name: session.tenantName,
    plan: session.tenantPlan,
    status: session.tenantStatus,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function validateTenantAccess(
  tenantId: string
): Promise<boolean> {
  const session = await getServerSession();
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  return session.tenantId === tenantId;
}

export function hasRole(
  userRol: Rol,
  requiredRoles: Rol | Rol[]
): boolean {
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return required.includes(userRol);
}

const PLAN_LIMITS: Record<Plan, { maxUsers: number; maxBodegas: number; maxProductos: number; maxMovimientos: number }> = {
  EMPRENDEDOR: {
    maxUsers: 3,
    maxBodegas: 2,
    maxProductos: 500,
    maxMovimientos: 1000,
  },
  NEGOCIO: {
    maxUsers: 10,
    maxBodegas: 10,
    maxProductos: 999999,
    maxMovimientos: 999999,
  },
  CORPORATIVO: {
    maxUsers: 999999,
    maxBodegas: 999999,
    maxProductos: 999999,
    maxMovimientos: 999999,
  },
};

export function getPlanLimits(plan: Plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.EMPRENDEDOR;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
