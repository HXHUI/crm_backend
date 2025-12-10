import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Target } from '../../entities/target.entity'
import { Department } from '../../entities/department.entity'
import { Member } from '../../entities/member.entity'
import { Tenant } from '../../entities/tenant.entity'
import { MemberDepartment } from '../../entities/member-department.entity'
import { TargetsService } from './targets.service'
import { TargetsController } from './targets.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Target, Department, Member, Tenant, MemberDepartment])],
  controllers: [TargetsController],
  providers: [TargetsService],
})
export class TargetsModule {}


