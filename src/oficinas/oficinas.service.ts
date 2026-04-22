import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOficinaDto } from './dto/create-oficina.dto';
import { UpdateOficinaDto } from './dto/update-oficina.dto';

@Injectable()
export class OficinasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOficinaDto, frontendUrl: string) {
    const existente = await this.prisma.oficina.findUnique({
      where: { nombre: dto.nombre },
    });
    if (existente) {
      throw new ConflictException('Ya existe una oficina con ese nombre');
    }

    const oficina = await this.prisma.oficina.create({
      data: {
        nombre: dto.nombre,
        ubicacion: dto.ubicacion,
      },
    });

    // Generar URL del QR con el ID de la oficina
    const qrUrl = `${frontendUrl}/reportar?oficina=${oficina.id}`;
    
    return this.prisma.oficina.update({
      where: { id: oficina.id },
      data: { codigoQr: qrUrl },
    });
  }

  async findAll() {
    return this.prisma.oficina.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });
  }

  async findAllActive() {
    return this.prisma.oficina.findMany({
      where: { activa: true },
      select: {
        id: true,
        nombre: true,
        ubicacion: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const oficina = await this.prisma.oficina.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!oficina) {
      throw new NotFoundException('Oficina no encontrada');
    }

    return oficina;
  }

  async update(id: string, dto: UpdateOficinaDto) {
    await this.findOne(id);

    if (dto.nombre) {
      const existente = await this.prisma.oficina.findFirst({
        where: { nombre: dto.nombre, NOT: { id } },
      });
      if (existente) {
        throw new ConflictException('Ya existe una oficina con ese nombre');
      }
    }

    return this.prisma.oficina.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.oficina.update({
      where: { id },
      data: { activa: false },
    });
  }
}
