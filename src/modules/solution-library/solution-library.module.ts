import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolutionLibraryController } from './solution-library.controller';
import { SolutionLibraryService } from './solution-library.service';
import { SolutionLibrary } from '../../entities/solution-library.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { CustomerRequirement } from '../../entities/customer-requirement.entity';
import { CustomerCompetitor } from '../../entities/customer-competitor.entity';
import { CompetitorAlternative } from '../../entities/competitor-alternative.entity';
import { Quote } from '../../entities/quote.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SolutionLibrary,
      Customer,
      Opportunity,
      CustomerRequirement,
      CustomerCompetitor,
      CompetitorAlternative,
      Quote,
    ]),
  ],
  controllers: [SolutionLibraryController],
  providers: [SolutionLibraryService],
  exports: [SolutionLibraryService],
})
export class SolutionLibraryModule {}

