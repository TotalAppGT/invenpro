import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { parseCSV } from "@/lib/utils";

interface CSVProductRow {
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  unidadmedida: string;
  costounit: string;
  preciounit: string;
  stockmin: string;
  stockmax: string;
  codigobarras: string;
  sku: string;
  proveedor: string;
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

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo CSV" },
        { status: 400 }
      );
    }

    const content = await file.text();
    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: "El archivo CSV está vacío" },
        { status: 400 }
      );
    }

    const rows = parseCSV<CSVProductRow>(content, (row) => ({
      codigo: row.codigo ?? "",
      nombre: row.nombre ?? "",
      descripcion: row.descripcion ?? "",
      categoria: row.categoria ?? "",
      unidadmedida: row.unidadmedida ?? "",
      costounit: row.costounit ?? "",
      preciounit: row.preciounit ?? "",
      stockmin: row.stockmin ?? "",
      stockmax: row.stockmax ?? "",
      codigobarras: row.codigobarras ?? "",
      sku: row.sku ?? "",
      proveedor: row.proveedor ?? "",
    }));
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No se encontraron filas de datos en el CSV" },
        { status: 400 }
      );
    }

    const imported: string[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const categoriasCache = new Map<string, string>();
    const proveedoresCache = new Map<string, string>();

    const categorias = await prisma.categoria.findMany({
      where: { tenantId: session.tenantId },
    });
    categorias.forEach((c: { nombre: string; id: string }) => categoriasCache.set(c.nombre.toLowerCase(), c.id));

    const proveedores = await prisma.proveedor.findMany({
      where: { tenantId: session.tenantId },
    });
    proveedores.forEach((p: { nombre: string; id: string }) => proveedoresCache.set(p.nombre.toLowerCase(), p.id));

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        if (!row.nombre?.trim()) {
          errors.push(`Fila ${rowNum}: Nombre es obligatorio`);
          continue;
        }

        const categoriaNombre = row.categoria?.trim().toLowerCase() ?? "";
        let categoriaId = categoriasCache.get(categoriaNombre);

        if (!categoriaId && categoriaNombre) {
          const newCategoria = await prisma.categoria.create({
            data: { nombre: row.categoria.trim() as string, tenantId: session.tenantId },
          });
          categoriaId = newCategoria.id;
          categoriasCache.set(categoriaNombre, categoriaId!);
          warnings.push(`Fila ${rowNum}: Categoría "${row.categoria!}" creada automáticamente`);
        }

        if (!categoriaId) {
          errors.push(`Fila ${rowNum}: Categoría no especificada o no encontrada`);
          continue;
        }

        let proveedorId: string | null = null;
        const proveedorNombre = row.proveedor?.trim().toLowerCase() ?? "";
        if (proveedorNombre) {
          proveedorId = proveedoresCache.get(proveedorNombre) ?? null;
          if (!proveedorId) {
            const newProveedor = await prisma.proveedor.create({
              data: { nombre: row.proveedor.trim() as string, tenantId: session.tenantId },
            });
            proveedorId = newProveedor.id;
            proveedoresCache.set(proveedorNombre, proveedorId!);
            warnings.push(`Fila ${rowNum}: Proveedor "${row.proveedor!}" creado automáticamente`);
          }
        }

        const costoUnit = parseFloat(row.costounit?.replace(",", ".") ?? "0") || 0;
        const precioUnit = parseFloat(row.preciounit?.replace(",", ".") ?? "0") || 0;
        const stockMin = parseInt(row.stockmin ?? "0", 10) || 0;
        const stockMax = parseInt(row.stockmax ?? "0", 10) || 0;

        if (costoUnit < 0) {
          errors.push(`Fila ${rowNum}: Costo unitario no puede ser negativo`);
          continue;
        }

        let codigo = row.codigo?.trim() ?? "";
        if (!codigo) {
          const count = await prisma.producto.count({ where: { tenantId: session.tenantId } });
          codigo = `PRD-${String(count + imported.length + 1).padStart(6, "0")}`;
        }

        const existingCode = await prisma.producto.findFirst({
          where: { tenantId: session.tenantId, codigo },
        });
        if (existingCode) {
          errors.push(`Fila ${rowNum}: El código "${codigo}" ya existe`);
          continue;
        }

        await prisma.producto.create({
          data: {
            codigo,
            nombre: row.nombre.trim(),
            descripcion: row.descripcion?.trim() ?? null,
            categoriaId,
            unidadMedida: (row.unidadmedida?.trim() || "UNIDAD").toUpperCase(),
            costoUnit,
            precioUnit,
            stockMin,
            stockMax,
            codigoBarras: row.codigobarras?.trim() ?? null,
            sku: row.sku?.trim() ?? null,
            proveedorId,
            estado: "ACTIVO",
            tenantId: session.tenantId,
          },
        });

        imported.push(row.nombre.trim());
      } catch (rowError) {
        errors.push(`Fila ${rowNum}: Error al procesar - ${(rowError as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: imported.length,
        skipped: errors.length,
        total: rows.length,
        importedNames: imported,
        errors,
        warnings,
      },
      message: `Importación completada: ${imported.length} productos importados, ${errors.length} errores`,
    });
  } catch (error) {
    console.error("Productos import error:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al procesar el CSV" },
      { status: 500 }
    );
  }
}
