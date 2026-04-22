import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';

@Injectable()
export class ComentariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateComentarioDto, user: any) {
    // Verificar que el ticket existe
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // Un técnico solo puede comentar en sus tickets asignados
    if (user.rol === 'TECNICO' && ticket.tecnicoId !== user.id) {
      throw new ForbiddenException('Solo puedes comentar en tickets asignados a ti');
    }

    return this.prisma.comentario.create({
      data: {
        contenido: dto.contenido,
        ticketId: dto.ticketId,
        usuarioId: user.id,
      },
      include: {
        usuario: { select: { nombre: true, rol: true } },
      },
    });
  }

  async findByTicket(ticketId: string) {
    return this.prisma.comentario.findMany({
      where: { ticketId },
      include: {
        usuario: { select: { nombre: true, rol: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }
}
