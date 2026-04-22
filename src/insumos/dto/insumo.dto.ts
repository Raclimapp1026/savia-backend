import { IsEnum, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export enum TipoInsumoEnum {
  TINTA = 'TINTA',
  TONER = 'TONER',
}

export enum TipoMovimientoEnum {
  INGRESO = 'INGRESO',
  SALIDA = 'SALIDA',
}

export class CreateInsumoDto {
  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  codigo: string;

  @IsEnum(TipoInsumoEnum, { message: 'Tipo debe ser TINTA o TONER' })
  @IsNotEmpty()
  tipoInsumo: TipoInsumoEnum;

  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo/referencia es obligatorio' })
  modelo: string;

  @IsString()
  @IsNotEmpty({ message: 'El color es obligatorio' })
  color: string;

  @IsOptional()
  @IsString()
  compatibleCon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateInsumoDto {
  @IsOptional() @IsString() codigo?: string;
  @IsOptional() @IsEnum(TipoInsumoEnum) tipoInsumo?: TipoInsumoEnum;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() compatibleCon?: string;
  @IsOptional() @IsInt() @Min(0) stockMinimo?: number;
  @IsOptional() @IsString() observaciones?: string;
}

export class RegistrarMovimientoDto {
  @IsEnum(TipoMovimientoEnum, { message: 'Tipo debe ser INGRESO o SALIDA' })
  @IsNotEmpty()
  tipo: TipoMovimientoEnum;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  cantidad: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  oficina?: string;

  @IsOptional()
  @IsString()
  firmaTecnico?: string;

  @IsOptional()
  @IsString()
  firmaRecibe?: string;

  @IsOptional()
  @IsString()
  nombreRecibe?: string;

  @IsOptional()
  @IsString()
  cargoRecibe?: string;
}
