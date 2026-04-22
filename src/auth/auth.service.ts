import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { correo, password } = loginDto;

    // Buscar usuario por correo
    const usuario = await this.prisma.usuario.findUnique({
      where: { correo },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado. Contacte al administrador.');
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar JWT
    const payload = {
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
      nombre: usuario.nombre,
    };

    // Actualizar presencia al login (solo técnicos)
    if (usuario.rol === 'TECNICO') {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { estadoPresencia: 'DISPONIBLE', ultimaActividad: new Date() },
      });
    }

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
        estadoPresencia: usuario.rol === 'TECNICO' ? 'DISPONIBLE' : undefined,
      },
    };
  }

  async cambiarPassword(userId: string, dto: CambiarPasswordDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const passwordValido = await bcrypt.compare(dto.passwordActual, usuario.passwordHash);
    if (!passwordValido) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    // Hash de la nueva contraseña
    const nuevoHash = await bcrypt.hash(dto.passwordNueva, 12);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash: nuevoHash },
    });

    return { mensaje: 'Contraseña actualizada exitosamente' };
  }

  async getPerfil(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, correo: true, rol: true, estadoPresencia: true, ultimaActividad: true },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    return usuario;
  }

  async cambiarPresencia(userId: string, estado: string) {
    const estadosValidos = ['DISPONIBLE', 'AUSENTE', 'EN_DESCANSO', 'NO_DISPONIBLE'];
    if (!estadosValidos.includes(estado)) {
      throw new BadRequestException('Estado no válido. Use: DISPONIBLE, AUSENTE, EN_DESCANSO o NO_DISPONIBLE');
    }

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { estadoPresencia: estado as any, ultimaActividad: new Date() },
    });

    return { mensaje: `Estado cambiado a ${estado}`, estado };
  }

  async logout(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (usuario && usuario.rol === 'TECNICO') {
      await this.prisma.usuario.update({
        where: { id: userId },
        data: { estadoPresencia: 'NO_DISPONIBLE', ultimaActividad: new Date() },
      });
    }
    return { mensaje: 'Sesión cerrada' };
  }

  async validateUser(userId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no válido');
    }

    return usuario;
  }
}
