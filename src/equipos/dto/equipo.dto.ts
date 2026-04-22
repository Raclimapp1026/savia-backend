import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export enum TipoEquipoEnum {
  PORTATIL = 'PORTATIL',
  EQUIPO_MESA = 'EQUIPO_MESA',
  IMPRESORA = 'IMPRESORA',
  IMPRESORA_MULTIFUNCIONAL = 'IMPRESORA_MULTIFUNCIONAL',
  TELEFONO_IP = 'TELEFONO_IP',
}

export enum EstadoEquipoEnum {
  ACTIVO = 'ACTIVO',
  EN_MANTENIMIENTO = 'EN_MANTENIMIENTO',
  DADO_DE_BAJA = 'DADO_DE_BAJA',
  EN_BODEGA = 'EN_BODEGA',
}

export class CreateEquipoDto {
  @IsString()
  @IsNotEmpty({ message: 'La placa de inventario es obligatoria' })
  placaInventario: string;

  @IsEnum(TipoEquipoEnum, { message: 'Tipo de equipo inválido' })
  @IsNotEmpty({ message: 'El tipo de equipo es obligatorio' })
  tipoEquipo: TipoEquipoEnum;

  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  modelo: string;

  @IsString()
  @IsNotEmpty({ message: 'El serial es obligatorio' })
  serial: string;

  @IsUUID('4', { message: 'La oficina seleccionada no es válida' })
  @IsNotEmpty({ message: 'La oficina es obligatoria' })
  oficinaId: string;

  @IsOptional()
  @IsEnum(EstadoEquipoEnum)
  estado?: EstadoEquipoEnum;

  @IsOptional()
  @IsDateString()
  fechaAdquisicion?: string;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateEquipoDto {
  @IsOptional() @IsString() placaInventario?: string;
  @IsOptional() @IsEnum(TipoEquipoEnum) tipoEquipo?: TipoEquipoEnum;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() serial?: string;
  @IsOptional() @IsUUID('4') oficinaId?: string;
  @IsOptional() @IsEnum(EstadoEquipoEnum) estado?: EstadoEquipoEnum;
  @IsOptional() @IsDateString() fechaAdquisicion?: string;
  @IsOptional() @IsString() proveedor?: string;
  @IsOptional() @IsString() observaciones?: string;
}
