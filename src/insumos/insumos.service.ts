import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInsumoDto, UpdateInsumoDto, RegistrarMovimientoDto } from './dto/insumo.dto';

@Injectable()
export class InsumosService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInsumoDto) {
    const existe = await this.prisma.insumo.findUnique({ where: { codigo: dto.codigo } });
    if (existe) throw new ConflictException(`Ya existe un insumo con el código ${dto.codigo}`);

    return this.prisma.insumo.create({
      data: {
        codigo: dto.codigo,
        tipoInsumo: dto.tipoInsumo as any,
        marca: dto.marca,
        modelo: dto.modelo,
        color: dto.color,
        compatibleCon: dto.compatibleCon,
        stockMinimo: dto.stockMinimo || 2,
        observaciones: dto.observaciones,
      },
    });
  }

  async findAll(filtros?: {
    tipoInsumo?: string;
    busqueda?: string;
    soloStockBajo?: string;
  }) {
    const where: any = { activo: true };
    if (filtros?.tipoInsumo) where.tipoInsumo = filtros.tipoInsumo;
    if (filtros?.busqueda) {
      where.OR = [
        { codigo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { marca: { contains: filtros.busqueda, mode: 'insensitive' } },
        { modelo: { contains: filtros.busqueda, mode: 'insensitive' } },
        { color: { contains: filtros.busqueda, mode: 'insensitive' } },
      ];
    }

    const insumos = await this.prisma.insumo.findMany({
      where,
      orderBy: [{ tipoInsumo: 'asc' }, { marca: 'asc' }, { modelo: 'asc' }],
    });

    if (filtros?.soloStockBajo === 'true') {
      return insumos.filter(i => i.stockActual <= i.stockMinimo);
    }

    return insumos;
  }

  async findOne(id: string) {
    const insumo = await this.prisma.insumo.findUnique({
      where: { id },
      include: {
        movimientos: {
          include: { usuario: { select: { nombre: true } } },
          orderBy: { fecha: 'desc' },
          take: 50,
        },
      },
    });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');
    return insumo;
  }

  async update(id: string, dto: UpdateInsumoDto) {
    const insumo = await this.findOne(id);

    if (dto.codigo && dto.codigo !== insumo.codigo) {
      const existe = await this.prisma.insumo.findUnique({ where: { codigo: dto.codigo } });
      if (existe) throw new ConflictException(`Ya existe un insumo con el código ${dto.codigo}`);
    }

    return this.prisma.insumo.update({
      where: { id },
      data: {
        ...dto,
        tipoInsumo: dto.tipoInsumo as any,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.insumo.update({ where: { id }, data: { activo: false } });
    return { mensaje: 'Insumo desactivado correctamente' };
  }

  async registrarMovimiento(insumoId: string, dto: RegistrarMovimientoDto, userId: string) {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: insumoId } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');

    // Validar stock suficiente para salidas
    if (dto.tipo === 'SALIDA' && insumo.stockActual < dto.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${insumo.stockActual}, solicitado: ${dto.cantidad}`
      );
    }

    // Calcular nuevo stock
    const nuevoStock = dto.tipo === 'INGRESO'
      ? insumo.stockActual + dto.cantidad
      : insumo.stockActual - dto.cantidad;

    // Crear movimiento y actualizar stock en transacción
    const [movimiento] = await this.prisma.$transaction([
      this.prisma.movimientoInsumo.create({
        data: {
          insumoId,
          tipo: dto.tipo as any,
          cantidad: dto.cantidad,
          observacion: dto.observacion,
          proveedor: dto.proveedor,
          oficina: dto.oficina,
          firmaTecnico: dto.firmaTecnico,
          firmaRecibe: dto.firmaRecibe,
          nombreRecibe: dto.nombreRecibe,
          cargoRecibe: dto.cargoRecibe,
          usuarioId: userId,
        },
        include: {
          usuario: { select: { nombre: true } },
          insumo: { select: { codigo: true, marca: true, modelo: true, color: true } },
        },
      }),
      this.prisma.insumo.update({
        where: { id: insumoId },
        data: { stockActual: nuevoStock },
      }),
    ]);

    // Verificar alerta de stock bajo
    const alertaStockBajo = nuevoStock <= insumo.stockMinimo;

    return {
      movimiento,
      stockActual: nuevoStock,
      alertaStockBajo,
      mensaje: alertaStockBajo
        ? `Movimiento registrado. ALERTA: Stock bajo (${nuevoStock} unidades, mínimo: ${insumo.stockMinimo})`
        : `Movimiento registrado. Stock actual: ${nuevoStock}`,
    };
  }

  async obtenerMovimientos(insumoId: string, filtros?: { fechaDesde?: string; fechaHasta?: string }) {
    const where: any = { insumoId };
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {};
      if (filtros.fechaDesde) where.fecha.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) where.fecha.lte = new Date(filtros.fechaHasta + 'T23:59:59');
    }

    return this.prisma.movimientoInsumo.findMany({
      where,
      include: {
        usuario: { select: { nombre: true } },
        insumo: { select: { codigo: true, marca: true, modelo: true, color: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async obtenerEstadisticas() {
    const [total, stockBajo, porTipo, movimientosRecientes] = await Promise.all([
      this.prisma.insumo.count({ where: { activo: true } }),
      this.prisma.insumo.findMany({
        where: { activo: true },
        select: { id: true, codigo: true, marca: true, modelo: true, color: true, stockActual: true, stockMinimo: true, tipoInsumo: true },
      }),
      this.prisma.insumo.groupBy({
        by: ['tipoInsumo'],
        _count: true,
        _sum: { stockActual: true },
        where: { activo: true },
      }),
      this.prisma.movimientoInsumo.findMany({
        take: 10,
        orderBy: { fecha: 'desc' },
        include: {
          insumo: { select: { codigo: true, marca: true, modelo: true, color: true } },
          usuario: { select: { nombre: true } },
        },
      }),
    ]);

    const conStockBajo = stockBajo.filter(i => i.stockActual <= i.stockMinimo);
    const stockTotal = stockBajo.reduce((acc, i) => acc + i.stockActual, 0);

    return {
      total,
      stockTotal,
      alertas: conStockBajo.length,
      insumosStockBajo: conStockBajo,
      porTipo: porTipo.map(t => ({
        tipo: t.tipoInsumo,
        cantidad: t._count,
        stockTotal: t._sum.stockActual || 0,
      })),
      movimientosRecientes,
    };
  }
}
