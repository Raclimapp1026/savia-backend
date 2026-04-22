import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTipoFallaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
