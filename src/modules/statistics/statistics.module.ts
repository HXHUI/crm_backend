import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Activity } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';
import { Order } from '../../entities/order.entity';
import { Contract } from '../../entities/contract.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Lead } from '../../entities/lead.entity';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, Contact, Opportunity, Activity, Member, Order, Contract, Department, MemberDepartment, Lead]),
    TenantModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
