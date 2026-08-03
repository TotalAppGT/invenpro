export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { sendWhatsAppMessage, sendNotification } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phone, template, params, mensaje } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "El número de teléfono es obligatorio" },
        { status: 400 }
      );
    }

    let result;

    if (mensaje && !template) {
      result = await sendNotification(phone, mensaje);
    } else if (template && Array.isArray(params)) {
      result = await sendWhatsAppMessage(phone, template, params);
    } else {
      return NextResponse.json(
        { success: false, error: "Debe proporcionar 'template' y 'params', o 'mensaje'" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Error al enviar el mensaje de WhatsApp",
          statusCode: result.statusCode,
        },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.messageId,
      },
      message: "Mensaje enviado exitosamente",
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
