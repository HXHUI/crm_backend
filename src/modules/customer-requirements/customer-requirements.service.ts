import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  CustomerRequirement,
  RequirementType,
  RequirementRelatedType,
} from '../../entities/customer-requirement.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';

export interface CreateRequirementDto {
  // 支持多态关联：relatedType + relatedId，或兼容旧的 customerId
  relatedType?: RequirementRelatedType;
  relatedId?: number;
  customerId?: number; // 兼容字段，如果提供则自动转换为 relatedType='customer', relatedId=customerId
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
  // 支持多态查询
  relatedType?: RequirementRelatedType;
  relatedId?: number;
  customerId?: number; // 兼容字段
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
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
  ) {}

  async createRequirement(createRequirementDto: CreateRequirementDto, memberId: number, tenantId: number) {
    // 处理兼容性：如果提供了 customerId，转换为 relatedType + relatedId
    let relatedType: RequirementRelatedType;
    let relatedId: number;

    if (createRequirementDto.relatedType && createRequirementDto.relatedId) {
      relatedType = createRequirementDto.relatedType;
      relatedId = createRequirementDto.relatedId;
    } else if (createRequirementDto.customerId) {
      // 兼容旧接口
      relatedType = RequirementRelatedType.CUSTOMER;
      relatedId = createRequirementDto.customerId;
    } else {
      throw new NotFoundException('必须提供 relatedType + relatedId 或 customerId');
    }

    // 验证关联对象是否存在并检查权限
    if (relatedType === RequirementRelatedType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({
        where: { id: relatedId, tenantId },
      });

      if (!customer) {
        throw new NotFoundException('客户不存在');
      }

      // 检查权限
      if (customer.ownerId && customer.ownerId !== memberId) {
        throw new ForbiddenException('无权为该客户创建需求');
      }
    } else if (relatedType === RequirementRelatedType.OPPORTUNITY) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: relatedId, tenantId },
      });

      if (!opportunity) {
        throw new NotFoundException('商机不存在');
      }

      // 检查权限
      if (opportunity.ownerId && opportunity.ownerId !== memberId) {
        throw new ForbiddenException('无权为该商机创建需求');
      }
    }

    const requirement = this.requirementRepository.create({
      relatedType,
      relatedId,
      type: createRequirementDto.type,
      content: createRequirementDto.content,
      problemToSolve: createRequirementDto.problemToSolve,
      tags: createRequirementDto.tags,
      status: createRequirementDto.status || 'pending',
      priority: createRequirementDto.priority ?? 0,
      notes: createRequirementDto.notes,
      tenantId,
    });

    return await this.requirementRepository.save(requirement);
  }

  async findAllRequirements(query: QueryRequirementDto, memberId: number, tenantId: number) {
    const { page = 1, limit = 50, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // 支持多态查询
    if (filters.relatedType && filters.relatedId) {
      where.relatedType = filters.relatedType;
      where.relatedId = filters.relatedId;
    } else if (filters.customerId) {
      // 兼容旧接口
      where.relatedType = RequirementRelatedType.CUSTOMER;
      where.relatedId = filters.customerId;
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
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限（支持客户和商机）
    if (requirement.relatedType === RequirementRelatedType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (customer?.ownerId && customer.ownerId !== memberId) {
        throw new ForbiddenException('无权查看该需求');
      }
    } else if (requirement.relatedType === RequirementRelatedType.OPPORTUNITY) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (opportunity?.ownerId && opportunity.ownerId !== memberId) {
        throw new ForbiddenException('无权查看该需求');
      }
    }

    return requirement;
  }

  async updateRequirement(id: number, updateRequirementDto: UpdateRequirementDto, memberId: number, tenantId: number) {
    const requirement = await this.requirementRepository.findOne({
      where: { id, tenantId },
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限（支持客户和商机）
    if (requirement.relatedType === RequirementRelatedType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (customer?.ownerId && customer.ownerId !== memberId) {
        throw new ForbiddenException('无权修改该需求');
      }
    } else if (requirement.relatedType === RequirementRelatedType.OPPORTUNITY) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (opportunity?.ownerId && opportunity.ownerId !== memberId) {
        throw new ForbiddenException('无权修改该需求');
      }
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
    });

    if (!requirement) {
      throw new NotFoundException('需求不存在');
    }

    // 检查权限（支持客户和商机）
    if (requirement.relatedType === RequirementRelatedType.CUSTOMER) {
      const customer = await this.customerRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (customer?.ownerId && customer.ownerId !== memberId) {
        throw new ForbiddenException('无权删除该需求');
      }
    } else if (requirement.relatedType === RequirementRelatedType.OPPORTUNITY) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: requirement.relatedId, tenantId },
      });
      if (opportunity?.ownerId && opportunity.ownerId !== memberId) {
        throw new ForbiddenException('无权删除该需求');
      }
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
      where: {
        relatedType: RequirementRelatedType.CUSTOMER,
        relatedId: customerId,
        tenantId,
      },
      order: { createdAt: 'DESC' },
    });

    return requirements;
  }

  // 新增：按商机查询需求
  async getRequirementsByOpportunity(opportunityId: number, memberId: number, tenantId: number) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId, tenantId },
    });

    if (!opportunity) {
      throw new NotFoundException('商机不存在');
    }

    // 检查权限
    if (opportunity.ownerId && opportunity.ownerId !== memberId) {
      throw new ForbiddenException('无权查看该商机的需求');
    }

    const requirements = await this.requirementRepository.find({
      where: {
        relatedType: RequirementRelatedType.OPPORTUNITY,
        relatedId: opportunityId,
        tenantId,
      },
      order: { createdAt: 'DESC' },
    });

    return requirements;
  }
}

