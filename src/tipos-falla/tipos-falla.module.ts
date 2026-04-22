import { Module } from '@nestjs/common';
import { TiposFallaService } from './tipos-falla.service';
import { TiposFallaController } from './tipos-falla.controller';

@Module({
  controllers: [TiposFallaController],
  providers: [TiposFallaService],
  exports: [TiposFallaService],
})
export class TiposFallaModule {}
