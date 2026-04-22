import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum TipoEquipoEnum {
  PORTATIL = 'PORTATIL',
  EQUIPO_MESA = 'EQUIPO_MESA',
  IMPRESORA = 'IMPRESORA',
  IMPRESORA_MULTIFUNCIONAL = 'IMPRESORA_MULTIFUNCIONAL',
  TELEFONO_IP = 'TELEFONO_IP',
  NO_APLICA = 'NO_APLICA',
}

export class ResolverTicketDto {
  @IsEnum(TipoEquipoEnum, {
    message: 'El tipo de equipo debe ser: PORTATIL, EQUIPO_MESA, IMPRESORA, IMPRESORA_MULTIFUNCIONAL, TELEFONO_IP o NO_APLICA',
  })
  @IsNotEmpty({ message: 'El tipo de equipo es obligatorio' })
  tipoEquipo: TipoEquipoEnum;

  @IsString()
  @IsNotEmpty({ message: 'La marca del equipo es obligatoria' })
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo del equipo es obligatorio' })
  modelo: string;

  @IsString()
  @IsNotEmpty({ message: 'El serial del equipo es obligatorio' })
  serial: string;

  @IsString()
  @IsNotEmpty({ message: 'Las observaciones son obligatorias' })
  observaciones: string;
}
