import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { Department } from '../../entities/department.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberDepartment } from '../../entities/member-department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Member, User, Tenant, MemberDepartment])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
