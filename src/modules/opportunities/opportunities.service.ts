import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity, OpportunityStatus, OpportunityStage } from '../../entities/opportunity.entity';
import { Customer } from '../../entities/customer.entity';
import { Member } from '../../entities/member.entity';

export interface CreateOpportunityDto {
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage?: 'lead' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expectedCloseDate: string;
  customerId: number;
}

export interface UpdateOpportunityDto {
  title?: string;
  description?: string;
  value?: number;
  currency?: string;
  stage?: 'lead' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expectedCloseDate?: string;
  customerId?: number;
}

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async createOpportunity(createOpportunityDto: CreateOpportunityDto, memberId: number, tenantId: number) {
    // 验证客户是否存在（可以是公海或私海）
    const customer = await this.customerRepository.findOne({
      where: { id: createOpportunityDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 字段映射
    const opportunity = this.opportunityRepository.create({
      name: createOpportunityDto.title,
      description: createOpportunityDto.description,
      amount: createOpportunityDto.value,
      probability: createOpportunityDto.probability || 0,
      expectedCloseDate: new Date(createOpportunityDto.expectedCloseDate),
      stage: this.mapStageToEntity(createOpportunityDto.stage || 'lead'),
      status: this.mapStageToStatus(createOpportunityDto.stage || 'lead'),
      customerId: createOpportunityDto.customerId,
      ownerId: memberId, // 当前用户作为负责人
      tenantId,
    });

    const savedOpportunity = await this.opportunityRepository.save(opportunity);
    
    // 加载关联数据
    return await this.opportunityRepository.findOne({
      where: { id: savedOpportunity.id },
      relations: ['customer', 'owner'],
    });
  }

  async findAllOpportunities(memberId: number, tenantId: number, page = 1, limit = 10, customerId?: number) {
    const whereConditions: any[] = [
      { ownerId: memberId }, // 当前用户负责的商机
      { ownerId: null }      // 公海商机（没有负责人）
    ];

    // 如果指定了客户ID，添加客户过滤条件
    if (customerId) {
      whereConditions.forEach(condition => {
        condition.customerId = customerId;
      });
    }

    const [opportunities, total] = await this.opportunityRepository.findAndCount({
      where: whereConditions.map(w => ({ ...w, tenantId })),
      relations: ['customer', 'owner', 'owner.user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 转换数据格式以匹配前端期望
    const formattedOpportunities = opportunities.map(opp => ({
      id: opp.id,
      title: opp.name,
      description: opp.description,
      value: opp.amount,
      currency: 'CNY',
      stage: this.mapEntityStageToFrontend(opp.stage),
      status: this.mapEntityStatusToFrontend(opp.status),
      probability: opp.probability,
      expectedCloseDate: opp.expectedCloseDate?.toISOString() || '',
      customerId: opp.customerId,
      ownerId: opp.ownerId,
      customer: opp.customer ? { id: opp.customer.id, name: opp.customer.name } : null,
      owner: opp.owner ? { id: opp.owner.id, username: opp.owner.nickname || opp.owner.user?.username || 'Unknown' } : null,
      createdAt: opp.createdAt.toISOString(),
      updatedAt: opp.updatedAt.toISOString(),
    }));

    return {
      opportunities: formattedOpportunities,
      total,
      page,
      limit,
    };
  }

  async findOpportunityById(id: number, memberId: number, tenantId: number) {
    const opportunity = await this.opportunityRepository.findOne({
      where: [
        { id, ownerId: memberId, tenantId }, // 当前用户负责的商机
        { id, ownerId: null, tenantId }      // 公海商机（没有负责人）
      ],
      relations: ['customer'],
    });

    if (!opportunity) {
      throw new NotFoundException('商机不存在');
    }

    return opportunity;
  }

  async updateOpportunity(
    id: number,
    updateOpportunityDto: UpdateOpportunityDto,
    memberId: number,
    tenantId: number,
  ) {
    const opportunity = await this.findOpportunityById(id, memberId, tenantId);

    // 字段映射
    if (updateOpportunityDto.title !== undefined) {
      opportunity.name = updateOpportunityDto.title;
    }
    if (updateOpportunityDto.description !== undefined) {
      opportunity.description = updateOpportunityDto.description;
    }
    if (updateOpportunityDto.value !== undefined) {
      opportunity.amount = updateOpportunityDto.value;
    }
    if (updateOpportunityDto.probability !== undefined) {
      opportunity.probability = updateOpportunityDto.probability;
    }
    if (updateOpportunityDto.expectedCloseDate !== undefined) {
      opportunity.expectedCloseDate = new Date(updateOpportunityDto.expectedCloseDate);
    }
    if (updateOpportunityDto.stage !== undefined) {
      opportunity.stage = this.mapStageToEntity(updateOpportunityDto.stage);
      opportunity.status = this.mapStageToStatus(updateOpportunityDto.stage);
    }
    if (updateOpportunityDto.customerId !== undefined) {
      // 验证新客户是否存在
      const customer = await this.customerRepository.findOne({
        where: { id: updateOpportunityDto.customerId },
      });
      if (!customer) {
        throw new NotFoundException('客户不存在');
      }
      opportunity.customerId = updateOpportunityDto.customerId;
    }

    const savedOpportunity = await this.opportunityRepository.save(opportunity);
    
    // 加载关联数据
    return await this.opportunityRepository.findOne({
      where: { id: savedOpportunity.id },
      relations: ['customer', 'owner'],
    });
  }


  async getOpportunityStats(memberId: number) {
    const totalOpportunities = await this.opportunityRepository.count({
      where: { ownerId: memberId },
    });

    const totalValue = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('SUM(opportunity.amount)', 'totalValue')
      .where('opportunity.ownerId = :memberId', { memberId })
      .getRawOne();

    const statusStats = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')
      .where('opportunity.ownerId = :memberId', { memberId })
      .groupBy('opportunity.status')
      .getRawMany();

    const stageStats = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('opportunity.stage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')
      .where('opportunity.ownerId = :memberId', { memberId })
      .groupBy('opportunity.stage')
      .getRawMany();

    const monthlyStats = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .select('DATE_FORMAT(opportunity.createdAt, "%Y-%m")', 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(opportunity.amount)', 'totalAmount')
      .where('opportunity.ownerId = :memberId', { memberId })
      .groupBy('DATE_FORMAT(opportunity.createdAt, "%Y-%m")')
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    return {
      totalOpportunities,
      totalValue: totalValue.totalValue || 0,
      statusStats,
      stageStats,
      monthlyStats,
    };
  }

  async updateOpportunityStage(id: number, stage: OpportunityStage, memberId: number) {
    // 仅基于memberId校验；如需更严格，可从机会关联的tenantId再比对
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    if (!opportunity) throw new NotFoundException('商机不存在');
    
    opportunity.stage = stage;
    
    // 根据阶段自动设置状态
    if (stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST) {
      if (stage === OpportunityStage.CLOSED_WON) {
        opportunity.actualCloseDate = new Date();
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }

  async updateOpportunityStatus(
    id: number,
    status: OpportunityStatus,
    memberId: number,
  ) {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    if (!opportunity) throw new NotFoundException('商机不存在');
    
    opportunity.status = status;
    
    // 如果状态是已结束，同时更新阶段和实际成交时间
    if (status === OpportunityStatus.CLOSED) {
      opportunity.actualCloseDate = new Date();
    }

    return await this.opportunityRepository.save(opportunity);
  }

  async closeOpportunity(
    id: number,
    status: 'closed_won' | 'closed_lost',
    memberId: number,
  ) {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    if (!opportunity) throw new NotFoundException('商机不存在');
    
    opportunity.status = status === 'closed_won' ? OpportunityStatus.CLOSED : OpportunityStatus.CLOSED;
    opportunity.stage = status === 'closed_won' ? OpportunityStage.CLOSED_WON : OpportunityStage.CLOSED_LOST;
    opportunity.actualCloseDate = new Date();

    return await this.opportunityRepository.save(opportunity);
  }

  async deleteOpportunity(id: number, memberId: number, tenantId: number) {
    const opportunity = await this.findOpportunityById(id, memberId, tenantId);
    await this.opportunityRepository.remove(opportunity);
  }

  // 辅助方法：将前端阶段映射到实体阶段
  private mapStageToEntity(stage: string): OpportunityStage {
    const stageMap: Record<string, OpportunityStage> = {
      'initial_contact': OpportunityStage.INITIAL_CONTACT,
      'needs_analysis': OpportunityStage.NEEDS_ANALYSIS,
      'proposal_quote': OpportunityStage.PROPOSAL_QUOTE,
      'negotiation_review': OpportunityStage.NEGOTIATION_REVIEW,
      'closed_won': OpportunityStage.CLOSED_WON,
      'closed_lost': OpportunityStage.CLOSED_LOST,
    };
    return stageMap[stage] || OpportunityStage.INITIAL_CONTACT;
  }

  // 辅助方法：将前端阶段映射到实体状态
  private mapStageToStatus(stage: string): OpportunityStatus {
    const statusMap: Record<string, OpportunityStatus> = {
      'initial_contact': OpportunityStatus.ACTIVE,
      'needs_analysis': OpportunityStatus.ACTIVE,
      'proposal_quote': OpportunityStatus.WAITING_CLIENT,
      'negotiation_review': OpportunityStatus.ACTIVE,
      'closed_won': OpportunityStatus.CLOSED,
      'closed_lost': OpportunityStatus.CLOSED,
    };
    return statusMap[stage] || OpportunityStatus.ACTIVE;
  }

  // 辅助方法：将实体阶段映射到前端阶段
  private mapEntityStageToFrontend(stage: OpportunityStage): string {
    const stageMap: Record<OpportunityStage, string> = {
      [OpportunityStage.INITIAL_CONTACT]: 'initial_contact',
      [OpportunityStage.NEEDS_ANALYSIS]: 'needs_analysis',
      [OpportunityStage.PROPOSAL_QUOTE]: 'proposal_quote',
      [OpportunityStage.NEGOTIATION_REVIEW]: 'negotiation_review',
      [OpportunityStage.CLOSED_WON]: 'closed_won',
      [OpportunityStage.CLOSED_LOST]: 'closed_lost',
    };
    return stageMap[stage] || 'initial_contact';
  }

  // 辅助方法：将实体状态映射到前端状态
  private mapEntityStatusToFrontend(status: OpportunityStatus): string {
    const statusMap: Record<OpportunityStatus, string> = {
      [OpportunityStatus.ACTIVE]: 'active',
      [OpportunityStatus.WAITING_CLIENT]: 'waiting_client',
      [OpportunityStatus.ON_HOLD]: 'on_hold',
      [OpportunityStatus.AT_RISK]: 'at_risk',
      [OpportunityStatus.CLOSED]: 'closed',
    };
    return statusMap[status] || 'active';
  }
}
