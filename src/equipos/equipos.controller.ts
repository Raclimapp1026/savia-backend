import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { CreateEquipoDto, UpdateEquipoDto } from './dto/equipo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('equipos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateEquipoDto) {
    return this.equiposService.create(dto);
  }

  @Post('importar')
  @Roles('ADMIN')
  importarMasivo(@Body() dto: { equipos: CreateEquipoDto[] }) {
    return this.equiposService.importarMasivo(dto.equipos);
  }

  @Get()
  @Roles('ADMIN', 'SUPERVISOR')
  findAll(
    @Query('oficinaId') oficinaId?: string,
    @Query('tipoEquipo') tipoEquipo?: string,
    @Query('estado') estado?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.equiposService.findAll({ oficinaId, tipoEquipo, estado, busqueda });
  }

  @Get('estadisticas')
  @Roles('ADMIN', 'SUPERVISOR')
  obtenerEstadisticas() {
    return this.equiposService.obtenerEstadisticas();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPERVISOR')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.equiposService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEquipoDto) {
    return this.equiposService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.equiposService.remove(id);
  }
}
