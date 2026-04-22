import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Prioridad } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombreSolicitante: string;

  @IsEmail({}, { message: 'El correo debe ser válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correoSolicitante: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de celular es obligatorio' })
  celularSolicitante: string;

  @IsUUID('4', { message: 'La oficina seleccionada no es válida' })
  @IsNotEmpty({ message: 'La oficina es obligatoria' })
  oficinaId: string;

  @IsUUID('4', { message: 'El tipo de falla seleccionado no es válido' })
  @IsNotEmpty({ message: 'El tipo de falla es obligatorio' })
  tipoFallaId: string;

  @IsOptional()
  @IsEnum(Prioridad, { message: 'La prioridad debe ser BAJA, MEDIA, ALTA o CRITICA' })
  prioridad?: Prioridad;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
