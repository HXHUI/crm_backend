import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../../entities/tenant.entity';
import { Member, MemberStatus } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';

export interface CreateTenantDto {
  name: string;
  description?: string;
}

export interface UpdateTenantDto {
  name?: string;
  description?: string;
  status?: TenantStatus;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getTenants(page: number, limit: number, search?: string) {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.owner', 'owner')
      .leftJoinAndSelect('tenant.members', 'members')
      .leftJoinAndSelect('members.user', 'user');

    if (search) {
      queryBuilder.where('tenant.name LIKE :search', {
        search: `%${search}%`
      });
    }

    const [tenants, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getTenantById(id: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
      relations: ['owner', 'members', 'members.user']
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    return tenant;
  }

  async createTenant(createTenantDto: CreateTenantDto, ownerId: string | number) {
    const { name, description } = createTenantDto;
    const ownerIdNum = typeof ownerId === 'string' ? parseInt(ownerId, 10) : ownerId;

    // 创建租户（无slug）
    const tenant = this.tenantRepository.create({
      name,
      description,
      ownerId: ownerIdNum,
      status: TenantStatus.ACTIVE,
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    // 创建租户所有者成员记录
    const member = this.memberRepository.create({
      userId: ownerIdNum,
      tenantId: savedTenant.id,
      status: MemberStatus.ACTIVE,
    });

    await this.memberRepository.save(member);

    return savedTenant;
  }

  async updateTenant(id: string | number, updateTenantDto: UpdateTenantDto, userId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查是否为租户所有者
    if (tenant.ownerId !== userIdNum) {
      throw new ForbiddenException('只有租户所有者才能修改租户信息');
    }

    // 移除对slug的更新逻辑

    Object.assign(tenant, updateTenantDto);
    return await this.tenantRepository.save(tenant);
  }

  async deleteTenant(id: string | number, userId: string | number) {
    const idNum = typeof id === 'string' ? parseInt(id, 10) : id;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const tenant = await this.tenantRepository.findOne({
      where: { id: idNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查是否为租户所有者
    if (tenant.ownerId !== userIdNum) {
      throw new ForbiddenException('只有租户所有者才能删除租户');
    }

    // 删除相关成员记录
    await this.memberRepository.delete({ tenantId: idNum });
    
    // 删除租户
    await this.tenantRepository.delete(idNum);
  }

  async getTenantMembers(tenantId: string | number, page: number, limit: number, search?: string) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const queryBuilder = this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.tenant', 'tenant')
      .where('member.tenantId = :tenantId', { tenantId: tenantIdNum });

    if (search) {
      queryBuilder.andWhere('user.username LIKE :search OR user.email LIKE :search', {
        search: `%${search}%`
      });
    }

    const [members, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      members,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async addTenantMember(tenantId: string | number, userId: string | number, role: string, operatorId: string | number) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    // 检查租户是否存在
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantIdNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查操作者是否为租户所有者
    if (tenant.ownerId !== operatorIdNum) {
      throw new ForbiddenException('只有租户所有者才能添加成员');
    }

    // 检查用户是否存在
    const user = await this.userRepository.findOne({
      where: { id: userIdNum },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查用户是否已经是租户成员
    const existingMember = await this.memberRepository.findOne({
      where: { tenantId: tenantIdNum, userId: userIdNum },
    });

    if (existingMember) {
      throw new ForbiddenException('用户已经是租户成员');
    }

    // 创建成员记录
    const member = this.memberRepository.create({
      userId: userIdNum,
      tenantId: tenantIdNum,
      status: MemberStatus.ACTIVE,
    });

    return await this.memberRepository.save(member);
  }

  async removeTenantMember(tenantId: string | number, memberId: string | number, operatorId: string | number) {
    const tenantIdNum = typeof tenantId === 'string' ? parseInt(tenantId, 10) : tenantId;
    const memberIdNum = typeof memberId === 'string' ? parseInt(memberId, 10) : memberId;
    const operatorIdNum = typeof operatorId === 'string' ? parseInt(operatorId, 10) : operatorId;
    // 检查租户是否存在
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantIdNum },
    });

    if (!tenant) {
      throw new NotFoundException('租户不存在');
    }

    // 检查操作者是否为租户所有者
    if (tenant.ownerId !== operatorIdNum) {
      throw new ForbiddenException('只有租户所有者才能移除成员');
    }

    // 检查成员是否存在
    const member = await this.memberRepository.findOne({
      where: { id: memberIdNum, tenantId: tenantIdNum },
    });

    if (!member) {
      throw new NotFoundException('成员不存在');
    }

    // 不能移除租户所有者
    if (member.userId === tenant.ownerId) {
      throw new ForbiddenException('不能移除租户所有者');
    }

    await this.memberRepository.delete(memberIdNum);
  }
}
