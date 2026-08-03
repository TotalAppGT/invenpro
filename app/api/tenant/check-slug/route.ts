import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug || slug.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "El parámetro slug es obligatorio (min 2 caracteres)" },
        { status: 400 }
      );
    }

    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug.trim())) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          slug: slug.trim(),
          reason: "El slug solo puede contener letras minúsculas, números y guiones",
        },
      });
    }

    const existing = await prisma.tenant.findUnique({
      where: { slug: slug.trim().toLowerCase() },
    });

    return NextResponse.json({
      success: true,
      data: {
        available: !existing,
        slug: slug.trim().toLowerCase(),
      },
    });
  } catch (error) {
    console.error("Check slug error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
