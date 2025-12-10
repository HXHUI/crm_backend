import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';
import { Opportunity } from '../../entities/opportunity.entity';
import { Customer } from '../../entities/customer.entity';
import { Member } from '../../entities/member.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Tenant } from '../../entities/tenant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, Customer, Member, Department, MemberDepartment, Tenant])],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService],
  exports: [OpportunitiesService],
})
export class OpportunitiesModule {}
