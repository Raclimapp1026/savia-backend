import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { EstadoTicket, Prioridad } from '@prisma/client';
import { Type } from 'class-transformer';

export class FiltrarTicketsDto {
  @IsOptional()
  @IsEnum(EstadoTicket)
  estado?: EstadoTicket;

  @IsOptional()
  @IsEnum(Prioridad)
  prioridad?: Prioridad;

  @IsOptional()
  @IsUUID()
  oficinaId?: string;

  @IsOptional()
  @IsUUID()
  tecnicoId?: string;

  @IsOptional()
  @IsUUID()
  tipoFallaId?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @Type(() => Number)
  pagina?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limite?: number = 20;
}
