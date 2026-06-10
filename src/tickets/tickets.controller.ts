import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AsignarTicketDto } from './dto/asignar-ticket.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { CambiarPrioridadDto } from './dto/cambiar-prioridad.dto';
import { FiltrarTicketsDto } from './dto/filtrar-tickets.dto';
import { ResolverTicketDto } from './dto/resolver-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), 'uploads', 'evidencias');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ====== ENDPOINTS PÚBLICOS (rate limit estricto) ======

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  create(@Body() dto: CreateTicketDto) {
    return this.ticketsService.create(dto);
  }

  @Get('consultar/:codigo')
  consultarPorCodigo(@Param('codigo') codigo: string) {
    return this.ticketsService.consultarPorCodigo(codigo);
  }

  // ====== ENDPOINTS PROTEGIDOS ======

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  findAll(@Query() filtros: FiltrarTicketsDto) {
    return this.ticketsService.findAll(filtros);
  }

  @Get('mis-tickets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  misTickets(@CurrentUser() user: any, @Query() filtros: FiltrarTicketsDto) {
    return this.ticketsService.findByTecnico(user.id, filtros);
  }

  @Get('metricas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR')
  obtenerMetricas(
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.ticketsService.obtenerMetricas({ fechaDesde, fechaHasta });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.findOne(id);
  }

  @Put(':id/asignar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  asignar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsignarTicketDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.asignar(id, dto, user);
  }

  @Put(':id/prioridad')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  cambiarPrioridad(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarPrioridadDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.cambiarPrioridad(id, dto.prioridad, user);
  }

  @Put(':id/resolver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `evidencia-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          cb(new Error('Solo se permiten imágenes JPG, PNG o WebP'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  resolverTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverTicketDto,
    @UploadedFile() foto: any,
    @CurrentUser() user: any,
  ) {
   const appUrl = process.env.APP_URL || 'http://localhost:3001';
   const fotoPath = foto ? `${appUrl}/uploads/evidencias/${foto.filename}` : undefined;
   return this.ticketsService.resolverTicket(id, dto, user, fotoPath);
  }

  @Put(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoDto,
    @CurrentUser() user: any,
  ) {
    return this.ticketsService.cambiarEstado(id, dto, user);
  }
}
