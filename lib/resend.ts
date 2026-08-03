import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "InvenPro <noreply@invenpro.app>";

export async function sendWelcomeEmail({
  to,
  nombre,
  tenantName,
  loginUrl,
}: {
  to: string;
  nombre: string;
  tenantName: string;
  loginUrl: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `¡Bienvenido a InvenPro, ${nombre}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a56db; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">InvenPro</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #111827;">¡Hola, ${nombre}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Has sido agregado a <strong>${tenantName}</strong> en InvenPro, 
            tu plataforma de gestión de inventario.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Accede a tu cuenta para comenzar a gestionar productos, bodegas y movimientos.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" 
               style="background-color: #1a56db; color: white; padding: 12px 32px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Iniciar Sesión
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Si tienes preguntas, responde a este correo o contacta a soporte.
          </p>
        </div>
        <div style="background-color: #f3f4f6; padding: 16px 24px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} InvenPro. Todos los derechos reservados.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendStockAlertEmail({
  to,
  productName,
  sku,
  currentStock,
  minStock,
  almacen,
  url,
}: {
  to: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  almacen: string;
  url: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `⚠️ Stock Bajo: ${productName} - ${currentStock} unidades`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">⚠️ Alerta de Stock Bajo</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #111827;">${productName}</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px; color: #6b7280;">SKU:</td>
              <td style="padding: 8px; font-weight: 600;">${sku}</td>
            </tr>
            <tr style="background-color: #fef2f2;">
              <td style="padding: 8px; color: #6b7280;">Stock Actual:</td>
              <td style="padding: 8px; font-weight: 600; color: #dc2626;">${currentStock}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280;">Stock Mínimo:</td>
              <td style="padding: 8px; font-weight: 600;">${minStock}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #6b7280;">Bodega:</td>
              <td style="padding: 8px; font-weight: 600;">${almacen}</td>
            </tr>
          </table>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${url}"
               style="background-color: #dc2626; color: white; padding: 12px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Ver Producto
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

export async function sendSubscriptionEmail({
  to,
  nombre,
  plan,
  action,
  details,
}: {
  to: string;
  nombre: string;
  plan: string;
  action: "created" | "updated" | "canceled" | "expired" | "trial_started" | "trial_ending";
  details?: string;
}) {
  const subjects: Record<string, string> = {
    created: "Suscripción Activada",
    updated: "Suscripción Actualizada",
    canceled: "Suscripción Cancelada",
    expired: "Suscripción Expirada",
    trial_started: "Período de Prueba Iniciado",
    trial_ending: "Período de Prueba por Finalizar",
  };

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `InvenPro - ${subjects[action] ?? "Notificación de Suscripción"}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a56db; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">InvenPro</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #111827;">Hola, ${nombre}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            ${subjects[action] ?? "Hubo un cambio en tu suscripción"}.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Plan: <strong>${plan}</strong>
          </p>
          ${details ? `<p style="color: #4b5563; line-height: 1.6;">${details}</p>` : ""}
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            Si tienes preguntas sobre tu suscripción, contacta a soporte.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  nombre,
  resetUrl,
}: {
  to: string;
  nombre: string;
  resetUrl: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "InvenPro - Restablecer Contraseña",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a56db; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">InvenPro</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #111827;">Hola, ${nombre}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Recibimos una solicitud para restablecer tu contraseña.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            Haz clic en el botón de abajo para crear una nueva contraseña. 
            Este enlace expira en 1 hora.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background-color: #1a56db; color: white; padding: 12px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Restablecer Contraseña
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendInvitationEmail({
  to,
  nombre,
  tenantName,
  invitedBy,
  acceptUrl,
}: {
  to: string;
  nombre: string;
  tenantName: string;
  invitedBy: string;
  acceptUrl: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${invitedBy} te ha invitado a ${tenantName} en InvenPro`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1a56db; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">InvenPro</h1>
        </div>
        <div style="padding: 32px 24px; background-color: #ffffff;">
          <h2 style="color: #111827;">Hola, ${nombre}</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>${invitedBy}</strong> te ha invitado a unirte a 
            <strong>${tenantName}</strong> en InvenPro.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${acceptUrl}"
               style="background-color: #1a56db; color: white; padding: 12px 32px;
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Aceptar Invitación
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Esta invitación expira en 7 días.
          </p>
        </div>
      </div>
    `,
  });
}
