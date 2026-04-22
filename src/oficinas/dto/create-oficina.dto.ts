import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOficinaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la oficina es obligatorio' })
  nombre: string;

  @IsOptional()
  @IsString()
  ubicacion?: string;
}
