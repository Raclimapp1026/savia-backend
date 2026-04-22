import { IsEnum, IsNotEmpty } from 'class-validator';
import { Prioridad } from '@prisma/client';

export class CambiarPrioridadDto {
  @IsEnum(Prioridad, { message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA' })
  @IsNotEmpty({ message: 'La prioridad es obligatoria' })
  prioridad: Prioridad;
}
