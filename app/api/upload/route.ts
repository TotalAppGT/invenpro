import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
];

async function saveFileLocally(
  buffer: Buffer,
  filename: string,
  subfolder: string
): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(uploadsDir, { recursive: true });

  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  const filePath = path.join(uploadsDir, uniqueName);
  await writeFile(filePath, buffer);

  const publicPath = `/uploads/${subfolder}/${uniqueName}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}${publicPath}`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "El archivo excede el tamaño máximo de 10MB" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: imágenes, CSV, Excel, PDF`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const effectiveFolder = `${session.tenantId}/${safeFolder}`;

    const url = await saveFileLocally(buffer, safeName, effectiveFolder);

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename: safeName,
        mimeType: file.type,
        size: file.size,
      },
      message: "Archivo subido exitosamente",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al subir el archivo" },
      { status: 500 }
    );
  }
}
