import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { InsumosService } from './insumos.service';
import { CreateInsumoDto, UpdateInsumoDto, RegistrarMovimientoDto } from './dto/insumo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('insumos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateInsumoDto) {
    return this.insumosService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  findAll(
    @Query('tipoInsumo') tipoInsumo?: string,
    @Query('busqueda') busqueda?: string,
    @Query('soloStockBajo') soloStockBajo?: string,
  ) {
    return this.insumosService.findAll({ tipoInsumo, busqueda, soloStockBajo });
  }

  @Get('estadisticas')
  @Roles('ADMIN', 'SUPERVISOR')
  obtenerEstadisticas() {
    return this.insumosService.obtenerEstadisticas();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.insumosService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInsumoDto) {
    return this.insumosService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.insumosService.remove(id);
  }

  @Post(':id/movimiento')
  @Roles('ADMIN', 'TECNICO')
  registrarMovimiento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarMovimientoDto,
    @CurrentUser() user: any,
  ) {
    return this.insumosService.registrarMovimiento(id, dto, user.id);
  }

  @Get(':id/movimientos')
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  obtenerMovimientos(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.insumosService.obtenerMovimientos(id, { fechaDesde, fechaHasta });
  }
}
