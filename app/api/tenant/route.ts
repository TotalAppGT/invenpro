export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { getPlanLimits } from "@/lib/subscriptions";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const tenantId = session.tenantId;

    const [tenant, bodegasCount, productosCount, usuariosCount, movimientosCount] =
      await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
        }),
        prisma.bodega.count({ where: { tenantId } }),
        prisma.producto.count({ where: { tenantId, estado: "ACTIVO" } }),
        prisma.user.count({ where: { tenantId, estado: "ACTIVO" } }),
        prisma.movimiento.count({ where: { tenantId } }),
      ]);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant no encontrado" },
        { status: 404 }
      );
    }

    const limits = getPlanLimits(tenant.plan);

    const usage = {
      bodegas: { used: bodegasCount, limit: limits.maxBodegas },
      productos: { used: productosCount, limit: limits.maxProductos },
      usuarios: { used: usuariosCount, limit: limits.maxUsers },
      movimientos: { used: movimientosCount, limit: limits.maxMovimientos },
    };

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        config: tenant.config || {},
        recurrenteCustomerId: tenant.recurrenteCustomerId,
        recurrenteSubscriptionId: tenant.recurrenteSubscriptionId,
        trialEndsAt: tenant.trialEndsAt,
        createdAt: tenant.createdAt,
        limits,
        usage,
      },
    });
  } catch (error) {
    console.error("Tenant GET error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    if (session.rol !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Solo el administrador puede modificar la configuración del tenant" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, config } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json(
          { success: false, error: "El nombre debe tener entre 2 y 100 caracteres" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (config !== undefined) {
      if (typeof config !== "object" || config === null || Array.isArray(config)) {
        return NextResponse.json(
          { success: false, error: "La configuración debe ser un objeto JSON válido" },
          { status: 400 }
        );
      }

      const currentTenant = await prisma.tenant.findUnique({
        where: { id: session.tenantId },
        select: { config: true },
      });

      const currentConfig = (currentTenant?.config as Record<string, unknown>) || {};
      const mergedConfig = deepMerge(currentConfig, config as Record<string, unknown>);
      updateData.config = mergedConfig;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No se proporcionaron campos para actualizar" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: session.tenantId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        config: tenant.config,
        updatedAt: tenant.updatedAt,
      },
      message: "Configuración actualizada exitosamente",
    });
  } catch (error) {
    console.error("Tenant PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (sourceVal === undefined) continue;
    if (
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }
  return result;
}
