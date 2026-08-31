import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoTicket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AsignarTicketDto } from './dto/asignar-ticket.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { FiltrarTicketsDto } from './dto/filtrar-tickets.dto';
import { ResolverTicketDto } from './dto/resolver-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // ==========================================
  // Generación de código de ticket: TIC260330-001
  // Formato: TIC + AA + MM + DD + - + consecutivo
  // ==========================================
  private async generarCodigoTicket(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const prefijo = `TIC${yy}${mm}${dd}`;

    // Usar transacción con retry para evitar colisiones concurrentes
    const maxIntentos = 5;
    for (let intento = 0; intento < maxIntentos; intento++) {
      const ultimoTicketHoy = await this.prisma.ticket.findFirst({
        where: { codigoTicket: { startsWith: prefijo } },
        orderBy: { codigoTicket: 'desc' },
      });

      let consecutivo = 1;
      if (ultimoTicketHoy) {
        const partes = ultimoTicketHoy.codigoTicket.split('-');
        consecutivo = parseInt(partes[1], 10) + 1;
      }

      const codigo = `${prefijo}-${String(consecutivo).padStart(3, '0')}`;

      // Verificar que no exista (protección contra condición de carrera)
      const existe = await this.prisma.ticket.findUnique({
        where: { codigoTicket: codigo },
      });

      if (!existe) return codigo;

      // Si existe, esperar un momento aleatorio y reintentar
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // Fallback: usar timestamp como sufijo
    const ts = Date.now().toString().slice(-4);
    return `${prefijo}-${ts}`;
  }

  // ==========================================
  // CREAR TICKET (Endpoint público)
  // ==========================================
  async create(dto: CreateTicketDto) {
    // Validar que la oficina existe y está activa
    const oficina = await this.prisma.oficina.findUnique({
      where: { id: dto.oficinaId },
    });
    if (!oficina || !oficina.activa) {
      throw new BadRequestException('La oficina seleccionada no existe o no está activa');
    }

    // Validar que el tipo de falla existe y está activo
    const tipoFalla = await this.prisma.tipoFalla.findUnique({
      where: { id: dto.tipoFallaId },
    });
    if (!tipoFalla || !tipoFalla.activo) {
      throw new BadRequestException('El tipo de falla seleccionado no existe o no está activo');
    }

    // Anti-spam: verificar cooldown de 2 minutos por correo
    const ticketReciente = await this.prisma.ticket.findFirst({
      where: {
        correoSolicitante: dto.correoSolicitante,
        fechaCreacion: {
          gte: new Date(Date.now() - 2 * 60 * 1000), // 2 minutos
        },
      },
    });
    if (ticketReciente) {
      throw new BadRequestException(
        'Ya registraste un ticket recientemente. Por favor espera 2 minutos antes de crear otro.',
      );
    }

    const codigoTicket = await this.generarCodigoTicket();

    const ticket = await this.prisma.ticket.create({
      data: {
        codigoTicket,
        nombreSolicitante: dto.nombreSolicitante,
        correoSolicitante: dto.correoSolicitante,
        celularSolicitante: dto.celularSolicitante,
        oficinaId: dto.oficinaId,
        tipoFallaId: dto.tipoFallaId,
        prioridad: dto.prioridad || 'MEDIA',
        descripcion: dto.descripcion,
      },
      include: {
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
      },
    });

    // Enviar correo de confirmación al usuario
    try {
      await this.mailService.enviarConfirmacionUsuario(ticket);
    } catch (error) {
      console.error('Error enviando correo al usuario:', error.message);
    }

    // Notificar al admin
    try {
      await this.mailService.notificarNuevoTicketAdmin(ticket);
    } catch (error) {
      console.error('Error enviando correo al admin:', error.message);
    }

    return {
      mensaje: 'Solicitud de soporte registrada exitosamente',
      codigoTicket: ticket.codigoTicket,
      ticket: {
        id: ticket.id,
        codigoTicket: ticket.codigoTicket,
        estado: ticket.estado,
        prioridad: ticket.prioridad,
        fechaCreacion: ticket.fechaCreacion,
        oficina: ticket.oficina.nombre,
        tipoFalla: ticket.tipoFalla.nombre,
      },
    };
  }

  // ==========================================
  // CONSULTAR TICKET PÚBLICO (por código)
  // ==========================================
  async consultarPorCodigo(codigo: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { codigoTicket: codigo.toUpperCase() },
      select: {
        id: true,
        codigoTicket: true,
        estado: true,
        prioridad: true,
        nombreSolicitante: true,
        fechaCreacion: true,
        fechaAsignacion: true,
        fechaResolucion: true,
        fechaCierre: true,
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true } },
        comentarios: {
          select: {
            contenido: true,
            fecha: true,
            usuario: { select: { nombre: true, rol: true } },
          },
          orderBy: { fecha: 'desc' },
          take: 5,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('No se encontró un ticket con ese código');
    }

    return ticket;
  }

  // ==========================================
  // LISTAR TICKETS CON FILTROS (Admin/Supervisor)
  // ==========================================
  async findAll(filtros: FiltrarTicketsDto) {
    const where: any = {};

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.prioridad) where.prioridad = filtros.prioridad;
    if (filtros.oficinaId) where.oficinaId = filtros.oficinaId;
    if (filtros.tecnicoId) where.tecnicoId = filtros.tecnicoId;
    if (filtros.tipoFallaId) where.tipoFallaId = filtros.tipoFallaId;

    if (filtros.fechaDesde || filtros.fechaHasta) {
      where.fechaCreacion = {};
      if (filtros.fechaDesde) where.fechaCreacion.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fechaCreacion.lte = new Date(filtros.fechaHasta + 'T23:59:59');
    }

    if (filtros.busqueda) {
      where.OR = [
        { codigoTicket: { contains: filtros.busqueda, mode: 'insensitive' } },
        { nombreSolicitante: { contains: filtros.busqueda, mode: 'insensitive' } },
        { correoSolicitante: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 20;
    const skip = (pagina - 1) * limite;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          oficina: { select: { nombre: true } },
          tipoFalla: { select: { nombre: true } },
          tecnico: { select: { id: true, nombre: true } },
          _count: { select: { comentarios: true } },
        },
        orderBy: [
          { estado: 'asc' },
          { prioridad: 'desc' },
          { fechaCreacion: 'desc' },
        ],
        skip,
        take: limite,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  // ==========================================
  // TICKETS DEL TÉCNICO
  // ==========================================
  async findByTecnico(tecnicoId: string, filtros: FiltrarTicketsDto) {
    const where: any = { tecnicoId };

    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.prioridad) where.prioridad = filtros.prioridad;

    const pagina = filtros.pagina || 1;
    const limite = filtros.limite || 20;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: {
          oficina: { select: { nombre: true } },
          tipoFalla: { select: { nombre: true } },
          _count: { select: { comentarios: true } },
        },
        orderBy: [
          { prioridad: 'desc' },
          { fechaCreacion: 'desc' },
        ],
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  // ==========================================
  // DETALLE DE UN TICKET
  // ==========================================
  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        oficina: true,
        tipoFalla: true,
        tecnico: { select: { id: true, nombre: true, correo: true } },
        comentarios: {
          include: {
            usuario: { select: { nombre: true, rol: true } },
          },
          orderBy: { fecha: 'desc' },
        },
        historialEstados: {
          include: {
            usuario: { select: { nombre: true, rol: true } },
          },
          orderBy: { fecha: 'desc' },
        },
        diagnostico: {
          include: {
            tecnico: { select: { nombre: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    return ticket;
  }

  // ==========================================
  // ASIGNAR TICKET A TÉCNICO (Solo Admin)
  // ==========================================
  async asignar(ticketId: string, dto: AsignarTicketDto, adminUser: any) {
    const ticket = await this.findOne(ticketId);

    if (ticket.estado === 'CERRADO') {
      throw new BadRequestException('No se puede asignar un ticket cerrado');
    }

    // Verificar que el técnico existe y está activo
    const tecnico = await this.prisma.usuario.findUnique({
      where: { id: dto.tecnicoId },
    });
    if (!tecnico || !tecnico.activo || tecnico.rol !== 'TECNICO') {
      throw new BadRequestException('El técnico seleccionado no es válido');
    }

    const estadoAnterior = ticket.estado;
    const tecnicoAnterior = ticket.tecnico?.nombre;
    const esReasignacion = !!ticket.tecnicoId;

    const ticketActualizado = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        tecnicoId: dto.tecnicoId,
        estado: 'ASIGNADO',
        fechaAsignacion: new Date(),
      },
      include: {
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true, correo: true } },
      },
    });

    // Registrar en historial
    await this.prisma.historialEstado.create({
      data: {
        ticketId,
        estadoAnterior: estadoAnterior as any,
        estadoNuevo: 'ASIGNADO',
        usuarioId: adminUser.id,
        observacion: esReasignacion
          ? `Ticket reasignado de ${tecnicoAnterior} a ${tecnico.nombre}`
          : `Ticket asignado a ${tecnico.nombre}`,
      },
    });

    // Notificar al técnico
    try {
      await this.mailService.notificarAsignacionTecnico(ticketActualizado);
    } catch (error) {
      console.error('Error enviando correo al técnico:', error.message);
    }

    return ticketActualizado;
  }

  // ==========================================
  // CAMBIAR ESTADO (Admin o Técnico asignado)
  // ==========================================
  async cambiarEstado(ticketId: string, dto: CambiarEstadoDto, user: any) {
    const ticket = await this.findOne(ticketId);
    const estadoAnterior = ticket.estado;
    const nuevoEstado = dto.estado;

    // Validar transiciones permitidas
    this.validarTransicion(estadoAnterior, nuevoEstado, user, ticket);

    const dataUpdate: any = { estado: nuevoEstado };

    if (nuevoEstado === 'RESUELTO') {
      dataUpdate.fechaResolucion = new Date();
    }
    if (nuevoEstado === 'CERRADO') {
      dataUpdate.fechaCierre = new Date();
    }

    const ticketActualizado = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: dataUpdate,
      include: {
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true, correo: true } },
      },
    });

    // Registrar en historial
    await this.prisma.historialEstado.create({
      data: {
        ticketId,
        estadoAnterior: estadoAnterior as any,
        estadoNuevo: nuevoEstado,
        usuarioId: user.id,
        observacion: dto.observacion,
      },
    });

    // Si se cierra, notificar al usuario
    if (nuevoEstado === 'CERRADO') {
      try {
        await this.mailService.notificarCierreUsuario(ticketActualizado);
      } catch (error) {
        console.error('Error enviando correo de cierre:', error.message);
      }
    }

    // Si se resuelve, notificar al admin
    if (nuevoEstado === 'RESUELTO') {
      try {
        await this.mailService.notificarResolucionAdmin(ticketActualizado);
      } catch (error) {
        console.error('Error enviando correo de resolución:', error.message);
      }
    }

    return ticketActualizado;
  }

  // ==========================================
  // RESOLVER TICKET CON DIAGNÓSTICO (Solo Técnico)
  // ==========================================
  async resolverTicket(ticketId: string, dto: ResolverTicketDto, user: any, fotoPath?: string) {
    const ticket = await this.findOne(ticketId);
    console.log('📸 [Service] fotoPath recibido:', fotoPath);

    // Validar que el ticket está EN_PROCESO
    if (ticket.estado !== 'EN_PROCESO') {
      throw new BadRequestException('Solo se pueden resolver tickets que estén EN PROCESO');
    }

    // Validar que es el técnico asignado
    if (user.rol === 'TECNICO' && ticket.tecnicoId !== user.id) {
      throw new ForbiddenException('Solo el técnico asignado puede resolver este ticket');
    }

    // Crear el diagnóstico técnico con foto
    await this.prisma.diagnosticoTecnico.create({
      data: {
        ticketId,
        tecnicoId: user.id,
        tipoEquipo: dto.tipoEquipo as any,
        marca: dto.marca,
        modelo: dto.modelo,
        serial: dto.serial,
        observaciones: dto.observaciones,
        fotoEvidencia: fotoPath || null,
      },
    });

    // Cambiar estado a RESUELTO
    const ticketActualizado = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        estado: 'RESUELTO',
        fechaResolucion: new Date(),
      },
      include: {
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true, correo: true } },
      },
    });

    // Registrar en historial
    await this.prisma.historialEstado.create({
      data: {
        ticketId,
        estadoAnterior: 'EN_PROCESO',
        estadoNuevo: 'RESUELTO',
        usuarioId: user.id,
        observacion: `Diagnóstico: ${dto.tipoEquipo} - ${dto.marca} ${dto.modelo} (S/N: ${dto.serial}). ${dto.observaciones}`,
      },
    });

    // Notificar al admin
    try {
      await this.mailService.notificarResolucionAdmin(ticketActualizado);
    } catch (error) {
      console.error('Error enviando correo de resolución:', error.message);
    }

    return ticketActualizado;
  }

  // ==========================================
  // CAMBIAR PRIORIDAD (Solo Admin)
  // ==========================================
  async cambiarPrioridad(ticketId: string, prioridad: any, adminUser: any) {
    const ticket = await this.findOne(ticketId);

    if (ticket.estado === 'CERRADO') {
      throw new BadRequestException('No se puede cambiar la prioridad de un ticket cerrado');
    }

    const prioridadAnterior = ticket.prioridad;

    const ticketActualizado = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { prioridad },
      include: {
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true, correo: true } },
      },
    });

    // Registrar en historial
    await this.prisma.historialEstado.create({
      data: {
        ticketId,
        estadoAnterior: ticket.estado as any,
        estadoNuevo: ticket.estado as any,
        usuarioId: adminUser.id,
        observacion: `Prioridad cambiada de ${prioridadAnterior} a ${prioridad}`,
      },
    });

    return ticketActualizado;
  }

  // ==========================================
  // VALIDAR TRANSICIONES DE ESTADO
  // ==========================================
  private validarTransicion(
    estadoActual: string,
    nuevoEstado: string,
    user: any,
    ticket: any,
  ) {
    const transicionesValidas: Record<string, string[]> = {
      ABIERTO: ['ASIGNADO'],
      ASIGNADO: ['EN_PROCESO'],
      EN_PROCESO: ['RESUELTO'],
      RESUELTO: ['CERRADO'],
      CERRADO: [],
    };

    if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
      throw new BadRequestException(
        `No se puede cambiar de "${estadoActual}" a "${nuevoEstado}". ` +
        `Transiciones válidas: ${transicionesValidas[estadoActual]?.join(', ') || 'ninguna'}`,
      );
    }

    // Solo el admin puede: ABIERTO→ASIGNADO, RESUELTO→CERRADO
    if (['ASIGNADO', 'CERRADO'].includes(nuevoEstado) && user.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede realizar esta acción');
    }

    // Solo el técnico asignado puede: ASIGNADO→EN_PROCESO, EN_PROCESO→RESUELTO
    if (['EN_PROCESO', 'RESUELTO'].includes(nuevoEstado)) {
      if (user.rol === 'TECNICO' && ticket.tecnicoId !== user.id) {
        throw new ForbiddenException('Solo el técnico asignado puede cambiar este estado');
      }
    }
  }

  // ==========================================
  // MÉTRICAS PARA DASHBOARD
  // ==========================================
  async obtenerMetricas(filtros?: { fechaDesde?: string; fechaHasta?: string }) {
    const whereDate: any = {};
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      whereDate.fechaCreacion = {};
      if (filtros.fechaDesde) whereDate.fechaCreacion.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) whereDate.fechaCreacion.lte = new Date(filtros.fechaHasta + 'T23:59:59');
    }

    const [
      totalPorEstado,
      totalPorPrioridad,
      totalPorOficina,
      totalPorTipoFalla,
      totalPorTecnico,
      ticketsHoy,
      ticketsSemana,
      ticketsMes,
    ] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['estado'],
        _count: true,
        where: whereDate,
      }),
      this.prisma.ticket.groupBy({
        by: ['prioridad'],
        _count: true,
        where: whereDate,
      }),
      this.prisma.ticket.groupBy({
        by: ['oficinaId'],
        _count: true,
        where: whereDate,
        orderBy: { _count: { oficinaId: 'desc' } },
        take: 10,
      }),
      this.prisma.ticket.groupBy({
        by: ['tipoFallaId'],
        _count: true,
        where: whereDate,
        orderBy: { _count: { tipoFallaId: 'desc' } },
      }),
      this.prisma.ticket.groupBy({
        by: ['tecnicoId'],
        _count: true,
        where: { ...whereDate, tecnicoId: { not: null } },
      }),
      // Tickets creados hoy
      this.prisma.ticket.count({
        where: {
          fechaCreacion: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      // Tickets esta semana
      this.prisma.ticket.count({
        where: {
          fechaCreacion: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Tickets este mes
      this.prisma.ticket.count({
        where: {
          fechaCreacion: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    // Obtener nombres de oficinas y tipos de falla para las métricas
    const oficinas = await this.prisma.oficina.findMany({
      select: { id: true, nombre: true },
    });
    const tiposFalla = await this.prisma.tipoFalla.findMany({
      select: { id: true, nombre: true },
    });
    const tecnicos = await this.prisma.usuario.findMany({
      where: { rol: 'TECNICO' },
      select: { id: true, nombre: true },
    });

    const oficinasMap = Object.fromEntries(oficinas.map(o => [o.id, o.nombre]));
    const tiposFallaMap = Object.fromEntries(tiposFalla.map(t => [t.id, t.nombre]));
    const tecnicosMap = Object.fromEntries(tecnicos.map(t => [t.id, t.nombre]));

    // Tiempo promedio de resolución (tickets cerrados)
    const ticketsCerrados = await this.prisma.ticket.findMany({
      where: { estado: 'CERRADO', fechaCierre: { not: null } },
      select: { fechaCreacion: true, fechaCierre: true },
    });

    let tiempoPromedioHoras = 0;
    if (ticketsCerrados.length > 0) {
      const totalHoras = ticketsCerrados.reduce((acc, t) => {
        const diff = t.fechaCierre!.getTime() - t.fechaCreacion.getTime();
        return acc + diff / (1000 * 60 * 60);
      }, 0);
      tiempoPromedioHoras = Math.round((totalHoras / ticketsCerrados.length) * 10) / 10;
    }

    // Agrupación por día de la semana de los últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 6);
    hace7Dias.setHours(0, 0, 0, 0);

    const ticketsUltimos7Dias = await this.prisma.ticket.findMany({
      where: { fechaCreacion: { gte: hace7Dias } },
      select: {
        fechaCreacion: true,
        oficina: { select: { nombre: true } },
        tipoFalla: { select: { nombre: true } },
        tecnico: { select: { nombre: true } },
      },
    });

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const porDiaSemana: any[] = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      fecha.setHours(0, 0, 0, 0);

      const diaTickets = ticketsUltimos7Dias.filter(t => {
        const f = new Date(t.fechaCreacion);
        f.setHours(0, 0, 0, 0);
        return f.getTime() === fecha.getTime();
      });

      const oficinasEnDia: Record<string, number> = {};
      const tiposFallaEnDia: Record<string, number> = {};
      const tecnicosEnDia: Record<string, number> = {};

      diaTickets.forEach(t => {
        if (t.oficina?.nombre) oficinasEnDia[t.oficina.nombre] = (oficinasEnDia[t.oficina.nombre] || 0) + 1;
        if (t.tipoFalla?.nombre) tiposFallaEnDia[t.tipoFalla.nombre] = (tiposFallaEnDia[t.tipoFalla.nombre] || 0) + 1;
        if (t.tecnico?.nombre) tecnicosEnDia[t.tecnico.nombre] = (tecnicosEnDia[t.tecnico.nombre] || 0) + 1;
      });

      porDiaSemana.push({
        dia: diasSemana[fecha.getDay()],
        fecha: fecha.toISOString().slice(0, 10),
        total: diaTickets.length,
        oficinas: oficinasEnDia,
        tiposFalla: tiposFallaEnDia,
        tecnicos: tecnicosEnDia,
      });
    }

    return {
      resumen: {
        ticketsHoy,
        ticketsSemana,
        ticketsMes,
        tiempoPromedioResolucionHoras: tiempoPromedioHoras,
      },
      porEstado: totalPorEstado.map(e => ({
        estado: e.estado,
        cantidad: e._count,
      })),
      porPrioridad: totalPorPrioridad.map(p => ({
        prioridad: p.prioridad,
        cantidad: p._count,
      })),
      porOficina: totalPorOficina.map(o => ({
        oficina: oficinasMap[o.oficinaId] || o.oficinaId,
        cantidad: o._count,
      })),
      porTipoFalla: totalPorTipoFalla.map(t => ({
        tipoFalla: tiposFallaMap[t.tipoFallaId] || t.tipoFallaId,
        cantidad: t._count,
      })),
      porTecnico: totalPorTecnico.map(t => ({
        tecnico: tecnicosMap[t.tecnicoId!] || t.tecnicoId,
        cantidad: t._count,
      })),
      porDiaSemana,
    };
  }
}
