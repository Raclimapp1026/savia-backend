import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUsuarioDto) {
    // Verificar si el correo ya existe
    const existente = await this.prisma.usuario.findUnique({
      where: { correo: dto.correo },
    });
    if (existente) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        correo: dto.correo,
        passwordHash,
        rol: dto.rol,
      },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
      },
    });

    return usuario;
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
        _count: {
          select: { ticketsAsignados: true },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }

  async findTecnicos() {
    const tecnicos = await this.prisma.usuario.findMany({
      where: { rol: 'TECNICO', activo: true },
      select: {
        id: true,
        nombre: true,
        correo: true,
        estadoPresencia: true,
        ultimaActividad: true,
        _count: {
          select: {
            ticketsAsignados: {
              where: {
                estado: { notIn: ['CERRADO'] },
              },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    // Ordenar: disponibles primero, luego por menor carga
    const ordenPresencia: Record<string, number> = { DISPONIBLE: 0, AUSENTE: 1, EN_DESCANSO: 2, NO_DISPONIBLE: 3 };
    return tecnicos.sort((a, b) => {
      const presA = ordenPresencia[a.estadoPresencia] ?? 4;
      const presB = ordenPresencia[b.estadoPresencia] ?? 4;
      if (presA !== presB) return presA - presB;
      return (a._count.ticketsAsignados || 0) - (b._count.ticketsAsignados || 0);
    });
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    await this.findOne(id);

    const data: any = { ...dto };

    // Si se actualiza la contraseña, hacer hash
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      delete data.password;
    }

    // Si se actualiza el correo, verificar que no exista
    if (dto.correo) {
      const existente = await this.prisma.usuario.findFirst({
        where: { correo: dto.correo, NOT: { id } },
      });
      if (existente) {
        throw new ConflictException('Ya existe un usuario con ese correo');
      }
    }

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
        fechaCreacion: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete: desactivar en vez de eliminar
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      select: {
        id: true,
        nombre: true,
        activo: true,
      },
    });
  }
}
