import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipoDto, UpdateEquipoDto } from './dto/equipo.dto';

@Injectable()
export class EquiposService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEquipoDto) {
    // Verificar que la placa y el serial sean únicos
    const existePlaca = await this.prisma.equipo.findUnique({
      where: { placaInventario: dto.placaInventario },
    });
    if (existePlaca) throw new ConflictException(`Ya existe un equipo con la placa ${dto.placaInventario}`);

    const existeSerial = await this.prisma.equipo.findUnique({
      where: { serial: dto.serial },
    });
    if (existeSerial) throw new ConflictException(`Ya existe un equipo con el serial ${dto.serial}`);

    // Verificar que la oficina existe
    const oficina = await this.prisma.oficina.findUnique({
      where: { id: dto.oficinaId },
    });
    if (!oficina) throw new BadRequestException('La oficina seleccionada no existe');

    return this.prisma.equipo.create({
      data: {
        placaInventario: dto.placaInventario,
        tipoEquipo: dto.tipoEquipo as any,
        marca: dto.marca,
        modelo: dto.modelo,
        serial: dto.serial,
        oficinaId: dto.oficinaId,
        estado: (dto.estado as any) || 'ACTIVO',
        fechaAdquisicion: dto.fechaAdquisicion ? new Date(dto.fechaAdquisicion) : undefined,
        proveedor: dto.proveedor,
        observaciones: dto.observaciones,
      },
      include: {
        oficina: { select: { nombre: true } },
      },
    });
  }

  async findAll(filtros?: {
    oficinaId?: string;
    tipoEquipo?: string;
    estado?: string;
    busqueda?: string;
  }) {
    const where: any = {};
    if (filtros?.oficinaId) where.oficinaId = filtros.oficinaId;
    if (filtros?.tipoEquipo) where.tipoEquipo = filtros.tipoEquipo;
    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.busqueda) {
      where.OR = [
        { placaInventario: { contains: filtros.busqueda, mode: 'insensitive' } },
        { serial: { contains: filtros.busqueda, mode: 'insensitive' } },
        { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
        { modelo: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    return this.prisma.equipo.findMany({
      where,
      include: {
        oficina: { select: { id: true, nombre: true } },
      },
      orderBy: [{ oficina: { nombre: 'asc' } }, { placaInventario: 'asc' }],
    });
  }

  async findOne(id: string) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { id },
      include: {
        oficina: true,
      },
    });
    if (!equipo) throw new NotFoundException('Equipo no encontrado');
    return equipo;
  }

  async update(id: string, dto: UpdateEquipoDto) {
    const equipo = await this.findOne(id);

    // Si cambia la placa, verificar que no exista
    if (dto.placaInventario && dto.placaInventario !== equipo.placaInventario) {
      const existe = await this.prisma.equipo.findUnique({
        where: { placaInventario: dto.placaInventario },
      });
      if (existe) throw new ConflictException(`Ya existe un equipo con la placa ${dto.placaInventario}`);
    }

    // Si cambia el serial, verificar que no exista
    if (dto.serial && dto.serial !== equipo.serial) {
      const existe = await this.prisma.equipo.findUnique({
        where: { serial: dto.serial },
      });
      if (existe) throw new ConflictException(`Ya existe un equipo con el serial ${dto.serial}`);
    }

    return this.prisma.equipo.update({
      where: { id },
      data: {
        ...dto,
        tipoEquipo: dto.tipoEquipo as any,
        estado: dto.estado as any,
        fechaAdquisicion: dto.fechaAdquisicion ? new Date(dto.fechaAdquisicion) : undefined,
      },
      include: {
        oficina: { select: { nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.equipo.delete({ where: { id } });
    return { mensaje: 'Equipo eliminado correctamente' };
  }

  async importarMasivo(equipos: CreateEquipoDto[]) {
    const resultados = {
      total: equipos.length,
      exitosos: 0,
      fallidos: 0,
      errores: [] as any[],
    };

    for (let i = 0; i < equipos.length; i++) {
      try {
        await this.create(equipos[i]);
        resultados.exitosos++;
      } catch (error) {
        resultados.fallidos++;
        resultados.errores.push({
          fila: i + 2, // +2 porque fila 1 es el header y el índice empieza en 0
          placa: equipos[i].placaInventario,
          error: error.message,
        });
      }
    }

    return resultados;
  }

  async obtenerEstadisticas() {
    const [total, porTipo, porEstado, porOficina] = await Promise.all([
      this.prisma.equipo.count(),
      this.prisma.equipo.groupBy({
        by: ['tipoEquipo'],
        _count: true,
      }),
      this.prisma.equipo.groupBy({
        by: ['estado'],
        _count: true,
      }),
      this.prisma.equipo.groupBy({
        by: ['oficinaId'],
        _count: true,
      }),
    ]);

    const oficinas = await this.prisma.oficina.findMany({
      select: { id: true, nombre: true },
    });
    const oficinasMap = Object.fromEntries(oficinas.map(o => [o.id, o.nombre]));

    return {
      total,
      porTipo: porTipo.map(t => ({ tipo: t.tipoEquipo, cantidad: t._count })),
      porEstado: porEstado.map(e => ({ estado: e.estado, cantidad: e._count })),
      porOficina: porOficina.map(o => ({
        oficina: oficinasMap[o.oficinaId] || o.oficinaId,
        cantidad: o._count,
      })),
    };
  }
}
