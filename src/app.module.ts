import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { OficinasModule } from './oficinas/oficinas.module';
import { TiposFallaModule } from './tipos-falla/tipos-falla.module';
import { TicketsModule } from './tickets/tickets.module';
import { ComentariosModule } from './comentarios/comentarios.module';
import { MailModule } from './mail/mail.module';
import { EquiposModule } from './equipos/equipos.module';
import { InsumosModule } from './insumos/insumos.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // ==========================================
    // SEGURIDAD: Rate Limiting global
    // Maximo 60 peticiones por minuto por IP
    // ==========================================
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    PrismaModule,
    AuthModule,
    UsuariosModule,
    OficinasModule,
    TiposFallaModule,
    TicketsModule,
    ComentariosModule,
    MailModule,
    EquiposModule,
    InsumosModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
