import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTipoFallaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del tipo de falla es obligatorio' })
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
