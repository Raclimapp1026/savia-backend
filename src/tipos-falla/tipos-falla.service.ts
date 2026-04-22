import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTipoFallaDto } from './dto/create-tipo-falla.dto';
import { UpdateTipoFallaDto } from './dto/update-tipo-falla.dto';

@Injectable()
export class TiposFallaService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTipoFallaDto) {
    const existente = await this.prisma.tipoFalla.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existente) {
      throw new ConflictException('Ya existe un tipo de falla con ese nombre');
    }

    return this.prisma.tipoFalla.create({ data: dto });
  }

  async findAll() {
    return this.prisma.tipoFalla.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async findAllActive() {
    return this.prisma.tipoFalla.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const tipoFalla = await this.prisma.tipoFalla.findUnique({
      where: { id },
      include: {
        _count: { select: { tickets: true } },
      },
    });

    if (!tipoFalla) {
      throw new NotFoundException('Tipo de falla no encontrado');
    }

    return tipoFalla;
  }

  async update(id: string, dto: UpdateTipoFallaDto) {
    await this.findOne(id);

    if (dto.nombre) {
      const existente = await this.prisma.tipoFalla.findFirst({
        where: { nombre: dto.nombre, NOT: { id } },
      });
      if (existente) {
        throw new ConflictException('Ya existe un tipo de falla con ese nombre');
      }
    }

    return this.prisma.tipoFalla.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.tipoFalla.update({
      where: { id },
      data: { activo: false },
    });
  }
}
