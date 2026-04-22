import { IsNotEmpty, IsUUID } from 'class-validator';

export class AsignarTicketDto {
  @IsUUID('4', { message: 'El técnico seleccionado no es válido' })
  @IsNotEmpty({ message: 'Debe seleccionar un técnico' })
  tecnicoId: string;
}
