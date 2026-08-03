import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "invenpro_session";

const ENCRYPTION_SECRET = new TextEncoder().encode(
  process.env.SESSION_ENCRYPTION_KEY || "fallback-dev-key-change-in-production-min-32-chars!!"
);

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/terminos",
  "/privacidad",
  "/contacto",
];

const API_PUBLIC_PREFIXES = [
  "/api/webhooks/recurrente",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/health",
  "/api/tenant/check-slug",
  "/api/whatsapp/webhook",
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/movimientos",
  "/productos",
  "/bodegas",
  "/proveedores",
  "/usuarios",
  "/reportes",
  "/configuracion",
  "/inventario",
  "/kardex",
  "/alertas",
  "/suscripcion",
  "/perfil",
  "/conteos",
  "/ordenes-compra",
  "/etiquetas",
  "/cierres",
  "/api/checkout",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true;
  }

  if (pathname.startsWith("/register/")) {
    return true;
  }

  if (pathname.startsWith("/api/")) {
    return API_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  }

  return false;
}

function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return true;
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(`/${prefix}`))) {
    return true;
  }

  if (pathname.startsWith("/api/") && !isPublicRoute(pathname)) {
    return true;
  }

  return false;
}

interface SessionData {
  uid: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantPlan: string;
  tenantStatus: string;
  nombre: string;
  rol: string;
  photo: string | null;
}

async function parseSession(cookieValue: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, ENCRYPTION_SECRET, {
      algorithms: ["HS256"],
    });

    if (!payload.uid || !payload.tenantId) return null;

    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const hasSession = !!sessionCookie?.value;

  let session: SessionData | null = null;
  if (sessionCookie?.value) {
    session = await parseSession(sessionCookie.value);
  }

  const isApiRoute = pathname.startsWith("/api/");
  const isStaticFile =
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/favicon.ico") ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/);

  if (isStaticFile) {
    return NextResponse.next();
  }

  if (isProtectedRoute(pathname) && !(session && sessionCookie?.value)) {
    if (isApiRoute) {
      return NextResponse.json(
        { success: false, error: "No autorizado. Inicie sesión para continuar." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && session && pathname === "/login") {
    if (session.email === "totalappgt@gmail.com" && session.rol === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (pathname.startsWith("/admin") && session) {
    const isSuperAdmin = session.email === "totalappgt@gmail.com" && session.rol === "ADMIN";
    if (!isSuperAdmin) {
      if (isApiRoute) {
        return NextResponse.json(
          { success: false, error: "Acceso denegado. Se requieren permisos de Super Admin." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (isApiRoute && session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant-id", session.tenantId);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");

    return response;
  }

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-tenant-id");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
