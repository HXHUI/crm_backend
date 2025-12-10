import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { Activity } from '../../entities/activity.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Contact } from '../../entities/contact.entity';
import { Lead } from '../../entities/lead.entity';
import { Member } from '../../entities/member.entity';
import { Department } from '../../entities/department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, Customer, Opportunity, Contact, Lead, Member, Department])],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
