import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { Visit } from '../../entities/visit.entity';
import { Department } from '../../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Department])],
  controllers: [VisitsController],
  providers: [VisitsService],
  exports: [VisitsService],
})
export class VisitsModule {}

