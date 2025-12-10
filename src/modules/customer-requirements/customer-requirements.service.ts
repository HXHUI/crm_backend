import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { CustomerRequirement, RequirementType } from '../../entities/customer-requirement.entity';
import { Customer } from '../../entities/customer.entity';

export interface CreateRequirementDto {
  customerId: number;
  type: RequirementType;
  content: string;
  problemToSolve?: string;
  tags?: string[];
  priority?: number;
  status?: string;
  notes?: string;
}

export interface UpdateRequirementDto {
  type?: RequirementType;
  content?: string;
  problemToSolve?: string;
  tags?: string[];
  priority?: number;
  status?: string;
  notes?: string;
  resolvedAt?: Date;
  resolvedBy?: number;
}

export interface QueryRequirementDto {
  customerId?: number;
  type?: RequirementType;
  status?: string;
  priority?: number;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomerRequirementsService {
  constructor(
    @InjectRepository(CustomerRequirement)
    private readonly requirementRepository: Repository<CustomerRequirement>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async createRequirement(createRequirementDto: CreateRequirementDto, memberId: number, tenantId: number) {
    // 验证客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: createRequirementDto.customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 检查权限：只能为自己的客户或公海客户创建需求
    if (customer.ownerId && customer.ownerId !== memberId) {
      throw new ForbiddenException('无权为该客户创建需求');
    }

    const requirement = this.requirementRepository.create({
      ...createRequirementDto,
      status: createRequirementDto.status || 'pending',
      priority: createRequirementDto.priority ?? 0,
      tenantId,
    });

    return await this.requirementRepository.save(requirement);
  }

  async findAllRequirements(query: QueryRequirementDto, memberId: number, tenantId: number) {
    const { page = 1, limit = 50, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.priority !== undefined) {
      where.priority = filters.priority;
    }

    if (filters.search) {
      where.content = Like(`%${filters.search}%`);
    }

    const [requirements, total] = await this.requirementRepository.findAndCount({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      requirements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneRequirement(id: number, memberId: number, tenantId: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id, tenantId },
      relations: ['customer'],
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限
    if (requirement.customer.ownerId && requirement.customer.ownerId !== memberId) {
      throw new ForbiddenException('无权查看该需求');
    }

    return requirement;
  }

  async updateRequirement(id: number, updateRequirementDto: UpdateRequirementDto, memberId: number, tenantId: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id, tenantId },
      relations: ['customer'],
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限
    if (requirement.customer.ownerId && requirement.customer.ownerId !== memberId) {
      throw new ForbiddenException('无权修改该需求');
    }

    // 如果状态改为已解决，自动设置解决时间和解决人
    if (updateRequirementDto.status === 'resolved' && requirement.status !== 'resolved') {
      updateRequirementDto.resolvedAt = new Date();
      updateRequirementDto.resolvedBy = memberId;
    }

    Object.assign(requirement, updateRequirementDto);
    return await this.requirementRepository.save(requirement);
  }

  async deleteRequirement(id: number, memberId: number, tenantId: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id, tenantId },
      relations: ['customer'],
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限
    if (requirement.customer.ownerId && requirement.customer.ownerId !== memberId) {
      throw new ForbiddenException('无权删除该需求');
    }

    await this.requirementRepository.remove(requirement);
    return { message: '删除成功' };
  }

  async getRequirementsByCustomer(customerId: number, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 检查权限
    if (customer.ownerId && customer.ownerId !== memberId) {
      throw new ForbiddenException('无权查看该客户的需求');
    }

    const requirements = await this.requirementRepository.find({
      where: { customerId, tenantId },
      order: { createdAt: 'DESC' },
    });

    return requirements;
  }
}

