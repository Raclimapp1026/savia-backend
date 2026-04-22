import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EstadoTicket } from '@prisma/client';

export class CambiarEstadoDto {
  @IsEnum(EstadoTicket, {
    message: 'El estado debe ser ABIERTO, ASIGNADO, EN_PROCESO, RESUELTO o CERRADO',
  })
  @IsNotEmpty({ message: 'El nuevo estado es obligatorio' })
  estado: EstadoTicket;

  @IsOptional()
  @IsString()
  observacion?: string;
}
