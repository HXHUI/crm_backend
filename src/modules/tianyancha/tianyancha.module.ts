import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TianyanchaService } from './tianyancha.service';
import { TianyanchaController } from './tianyancha.controller';

@Module({
  imports: [ConfigModule],
  controllers: [TianyanchaController],
  providers: [TianyanchaService],
  exports: [TianyanchaService],
})
export class TianyanchaModule {}

