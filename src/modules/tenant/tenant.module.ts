import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { Tenant } from '../../entities/tenant.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { MemberRole } from '../../entities/member-role.entity';
import { TenantOwnerGuard } from '../../common/guards/tenant-owner.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Member, User, Role, MemberRole])],
  controllers: [TenantController],
  providers: [TenantService, TenantOwnerGuard],
  exports: [TenantService],
})
export class TenantModule {}
