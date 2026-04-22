import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ComentariosService } from './comentarios.service';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('comentarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post()
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  create(@Body() dto: CreateComentarioDto, @CurrentUser() user: any) {
    return this.comentariosService.create(dto, user);
  }

  @Get('ticket/:ticketId')
  @Roles('ADMIN', 'SUPERVISOR', 'TECNICO')
  findByTicket(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.comentariosService.findByTicket(ticketId);
  }
}
