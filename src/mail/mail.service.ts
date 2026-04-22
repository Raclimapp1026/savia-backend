import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get('MAIL_HOST') || this.config.get('SMTP_HOST', 'smtp.gmail.com');
    const port = this.config.get('MAIL_PORT') || this.config.get('SMTP_PORT', 587);
    const user = this.config.get('MAIL_USER') || this.config.get('SMTP_USER');
    const pass = this.config.get('MAIL_PASS') || this.config.get('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: false,
      auth: { user, pass },
    });

    // Verificar conexión al iniciar
    if (user && pass) {
      this.transporter.verify()
        .then(() => console.log('Correo SMTP conectado correctamente'))
        .catch((err) => console.error('Error conectando SMTP:', err.message));
    } else {
      console.log('SMTP no configurado - correos deshabilitados');
    }
  }

  private getFrom(): string {
    return this.config.get('MAIL_FROM') || this.config.get('SMTP_FROM', 'SAVIA Soporte <soporte@entidad.gov.co>');
  }

  private baseTemplate(titulo: string, contenido: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f0f5f2;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;padding:20px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(10,74,45,0.08);">
            <tr><td style="background-color:#0a4a2d;padding:28px 32px;text-align:center;">
              <h1 style="color:#f9f7d9;margin:0;font-size:24px;letter-spacing:3px;font-weight:bold;">SAVIA</h1>
              <p style="color:#08ae62;margin:6px 0 0;font-size:12px;">Sistema de Atencion Vital e Integral de Asistencia</p>
            </td></tr>
            <tr><td style="background-color:#08ae62;padding:14px 32px;">
              <h2 style="color:#ffffff;margin:0;font-size:15px;font-weight:600;">${titulo}</h2>
            </td></tr>
            <tr><td style="padding:28px 32px;">${contenido}</td></tr>
            <tr><td style="background-color:#f0f5f2;padding:16px 32px;border-top:1px solid #d1ddd6;">
              <p style="color:#6b8578;font-size:11px;margin:0;text-align:center;">
                Alcaldia de Puerto Colombia - Oficina TIC<br/>
                Este es un correo automatico de SAVIA. No responda a este mensaje.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`;
  }

  private infoRow(label: string, value: string): string {
    return `<tr>
      <td style="padding:8px 12px;font-weight:600;color:#0a4a2d;font-size:13px;border-bottom:1px solid #f0f5f2;width:40%;">${label}</td>
      <td style="padding:8px 12px;color:#4a5e52;font-size:13px;border-bottom:1px solid #f0f5f2;">${value}</td>
    </tr>`;
  }

  private badgeEstado(estado: string): string {
    const colores: Record<string, string> = {
      ABIERTO:'#3182ce', ASIGNADO:'#d69e2e', EN_PROCESO:'#dd6b20', RESUELTO:'#08ae62', CERRADO:'#0a4a2d',
    };
    return `<span style="background-color:${colores[estado]||'#718096'};color:#fff;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:bold;">${estado.replace('_',' ')}</span>`;
  }

  private badgePrioridad(prioridad: string): string {
    const colores: Record<string, string> = {
      BAJA:'#08ae62', MEDIA:'#d69e2e', ALTA:'#dd6b20', CRITICA:'#e53e3e',
    };
    return `<span style="background-color:${colores[prioridad]||'#718096'};color:#fff;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:bold;">${prioridad}</span>`;
  }

  private alertBox(color: string, bgColor: string, texto: string): string {
    return `<div style="background-color:${bgColor};border-left:4px solid ${color};padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;">
      <p style="color:${color};font-size:13px;margin:0;">${texto}</p>
    </div>`;
  }

  // 1. Confirmación al usuario que reporta
  async enviarConfirmacionUsuario(ticket: any) {
    const contenido = `
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Estimado/a <strong style="color:#0a4a2d;">${ticket.nombreSolicitante}</strong>,
      </p>
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Su solicitud de soporte tecnico ha sido recibida exitosamente.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;border-radius:8px;margin:16px 0;">
        ${this.infoRow('Codigo de Ticket', `<strong style="color:#0a4a2d;font-size:18px;letter-spacing:1px;">${ticket.codigoTicket}</strong>`)}
        ${this.infoRow('Estado', this.badgeEstado(ticket.estado))}
        ${this.infoRow('Oficina', ticket.oficina?.nombre || '')}
        ${this.infoRow('Tipo de Falla', ticket.tipoFalla?.nombre || '')}
        ${this.infoRow('Fecha', new Date(ticket.fechaCreacion).toLocaleString('es-CO'))}
        ${ticket.descripcion ? this.infoRow('Descripcion', ticket.descripcion) : ''}
      </table>
      ${this.alertBox('#0a4a2d', '#f9f7d9', `<strong>Guarde su codigo de ticket:</strong> ${ticket.codigoTicket}<br/>Con este codigo puede consultar el estado de su solicitud en cualquier momento.`)}
    `;
    await this.transporter.sendMail({
      from: this.getFrom(), to: ticket.correoSolicitante,
      subject: `Solicitud Recibida - ${ticket.codigoTicket}`,
      html: this.baseTemplate('Solicitud de Soporte Recibida', contenido),
    });
  }

  // 2. Notificación al Admin (nuevo ticket)
  async notificarNuevoTicketAdmin(ticket: any) {
    const adminEmail = this.config.get('ADMIN_EMAIL');
    if (!adminEmail) return;
    const contenido = `
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Se ha registrado una <strong style="color:#0a4a2d;">nueva solicitud de soporte</strong> que requiere asignacion:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;border-radius:8px;margin:16px 0;">
        ${this.infoRow('Codigo', `<strong>${ticket.codigoTicket}</strong>`)}
        ${this.infoRow('Solicitante', ticket.nombreSolicitante)}
        ${this.infoRow('Correo', ticket.correoSolicitante)}
        ${this.infoRow('Celular', ticket.celularSolicitante)}
        ${this.infoRow('Oficina', ticket.oficina?.nombre || '')}
        ${this.infoRow('Tipo de Falla', ticket.tipoFalla?.nombre || '')}
        ${ticket.descripcion ? this.infoRow('Descripcion', ticket.descripcion) : ''}
      </table>
      ${this.alertBox('#d69e2e', '#fffbeb', '<strong>Accion requerida:</strong> Ingrese al sistema para asignar prioridad y tecnico a este ticket.')}
    `;
    await this.transporter.sendMail({
      from: this.getFrom(), to: adminEmail,
      subject: `[NUEVO TICKET] ${ticket.codigoTicket} - ${ticket.tipoFalla?.nombre || 'Soporte'}`,
      html: this.baseTemplate('Nuevo Ticket de Soporte', contenido),
    });
  }

  // 3. Notificación al Técnico (asignación)
  async notificarAsignacionTecnico(ticket: any) {
    if (!ticket.tecnico?.correo) return;
    const contenido = `
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Se le ha <strong style="color:#0a4a2d;">asignado un nuevo ticket</strong> de soporte tecnico:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;border-radius:8px;margin:16px 0;">
        ${this.infoRow('Codigo', `<strong>${ticket.codigoTicket}</strong>`)}
        ${this.infoRow('Solicitante', ticket.nombreSolicitante)}
        ${this.infoRow('Oficina', ticket.oficina?.nombre || '')}
        ${this.infoRow('Tipo de Falla', ticket.tipoFalla?.nombre || '')}
        ${this.infoRow('Prioridad', this.badgePrioridad(ticket.prioridad))}
        ${ticket.descripcion ? this.infoRow('Descripcion', ticket.descripcion) : ''}
      </table>
      ${this.alertBox('#08ae62', '#ecfdf5', '<strong>Accion requerida:</strong> Ingrese al sistema para atender este ticket y cambiar su estado a "En Proceso".')}
    `;
    await this.transporter.sendMail({
      from: this.getFrom(), to: ticket.tecnico.correo,
      subject: `[TICKET ASIGNADO] ${ticket.codigoTicket} - ${ticket.tipoFalla?.nombre || 'Soporte'}`,
      html: this.baseTemplate('Ticket Asignado', contenido),
    });
  }

  // 4. Notificación al Admin (ticket resuelto)
  async notificarResolucionAdmin(ticket: any) {
    const adminEmail = this.config.get('ADMIN_EMAIL');
    if (!adminEmail) return;
    const contenido = `
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        El ticket <strong style="color:#0a4a2d;">${ticket.codigoTicket}</strong> ha sido marcado como
        <strong>RESUELTO</strong> por el tecnico ${ticket.tecnico?.nombre || 'asignado'}.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;border-radius:8px;margin:16px 0;">
        ${this.infoRow('Codigo', `<strong>${ticket.codigoTicket}</strong>`)}
        ${this.infoRow('Estado', this.badgeEstado('RESUELTO'))}
        ${this.infoRow('Tecnico', ticket.tecnico?.nombre || 'N/A')}
        ${this.infoRow('Oficina', ticket.oficina?.nombre || '')}
      </table>
      ${this.alertBox('#08ae62', '#ecfdf5', '<strong>Accion requerida:</strong> Verifique el diagnostico tecnico y cierre el ticket si todo esta correcto.')}
    `;
    await this.transporter.sendMail({
      from: this.getFrom(), to: adminEmail,
      subject: `[RESUELTO] ${ticket.codigoTicket} - Pendiente de cierre`,
      html: this.baseTemplate('Ticket Resuelto - Pendiente de Cierre', contenido),
    });
  }

  // 5. Notificación al usuario (ticket cerrado)
  async notificarCierreUsuario(ticket: any) {
    const contenido = `
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Estimado/a <strong style="color:#0a4a2d;">${ticket.nombreSolicitante}</strong>,
      </p>
      <p style="color:#4a5e52;font-size:14px;line-height:1.6;">
        Su solicitud de soporte tecnico ha sido <strong style="color:#08ae62;">atendida y cerrada</strong> exitosamente.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f5f2;border-radius:8px;margin:16px 0;">
        ${this.infoRow('Codigo', `<strong>${ticket.codigoTicket}</strong>`)}
        ${this.infoRow('Estado', this.badgeEstado('CERRADO'))}
        ${this.infoRow('Oficina', ticket.oficina?.nombre || '')}
        ${this.infoRow('Tecnico', ticket.tecnico?.nombre || 'N/A')}
      </table>
      ${this.alertBox('#0a4a2d', '#f9f7d9', 'Gracias por utilizar SAVIA. Si necesita reportar otra incidencia, escanee nuevamente el codigo QR de su oficina.')}
    `;
    await this.transporter.sendMail({
      from: this.getFrom(), to: ticket.correoSolicitante,
      subject: `Solicitud Atendida - ${ticket.codigoTicket}`,
      html: this.baseTemplate('Solicitud Atendida y Cerrada', contenido),
    });
  }
}
