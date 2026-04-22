import { Controller, Post, Body, Get, Put, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('perfil')
  async getPerfil(@CurrentUser() user: any) {
    return this.authService.getPerfil(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('cambiar-password')
  async cambiarPassword(
    @CurrentUser() user: any,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.authService.cambiarPassword(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('presencia')
  async cambiarPresencia(
    @CurrentUser() user: any,
    @Body() dto: { estado: string },
  ) {
    return this.authService.cambiarPresencia(user.id, dto.estado);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }
}
