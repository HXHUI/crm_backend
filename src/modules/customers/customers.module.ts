import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Member } from '../../entities/member.entity';
import { Activity } from '../../entities/activity.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Department } from '../../entities/department.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerCreditHistory } from '../../entities/customer-credit-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Contact, Member, Activity, Tenant, MemberDepartment, Department, CustomerProfile, CustomerCreditHistory])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
