import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../../entities/lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Activity } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Customer, Contact, Opportunity, Activity, Member])],
  providers: [LeadsService],
  controllers: [LeadsController],
})
export class LeadsModule {}


