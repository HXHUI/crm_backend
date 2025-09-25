import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CliService } from './cli.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
  ],
  providers: [CliService],
  exports: [CliService],
})
export class CliModule {}
