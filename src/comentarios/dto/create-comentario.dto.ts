import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateComentarioDto {
  @IsUUID('4', { message: 'El ticket no es válido' })
  @IsNotEmpty()
  ticketId: string;

  @IsString()
  @IsNotEmpty({ message: 'El comentario no puede estar vacío' })
  contenido: string;
}
