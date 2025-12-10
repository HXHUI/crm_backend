import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRequirementsController } from './customer-requirements.controller';
import { CustomerRequirementsService } from './customer-requirements.service';
import { CustomerRequirement } from '../../entities/customer-requirement.entity';
import { Customer } from '../../entities/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequirement, Customer])],
  controllers: [CustomerRequirementsController],
  providers: [CustomerRequirementsService],
  exports: [CustomerRequirementsService],
})
export class CustomerRequirementsModule {}

