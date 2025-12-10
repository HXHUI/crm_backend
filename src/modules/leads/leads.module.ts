import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Activity } from '../../entities/activity.entity';
import { Visit } from '../../entities/visit.entity';
import { Member } from '../../entities/member.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Customer, Contact, Opportunity, Activity, Visit, Member, Department, MemberDepartment])],
  providers: [LeadsService],
  controllers: [LeadsController],
})
export class LeadsModule {}


