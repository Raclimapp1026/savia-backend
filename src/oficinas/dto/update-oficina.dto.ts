import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOficinaDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
