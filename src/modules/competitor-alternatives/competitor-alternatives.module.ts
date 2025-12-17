import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitorAlternative, CustomerCompetitor } from '../../entities';
import { CompetitorAlternativesService } from './competitor-alternatives.service';
import { CompetitorAlternativesController } from './competitor-alternatives.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompetitorAlternative, CustomerCompetitor])],
  providers: [CompetitorAlternativesService],
  controllers: [CompetitorAlternativesController],
  exports: [CompetitorAlternativesService],
})
export class CompetitorAlternativesModule {}


