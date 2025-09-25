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
  customerId: string;
}

export interface UpdateOpportunityDto {
  title?: string;
  description?: string;
  value?: number;
  currency?: string;
  stage?: 'lead' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expectedCloseDate?: string;
  customerId?: string;
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

  async createOpportunity(createOpportunityDto: CreateOpportunityDto, memberId: string, tenantId: string) {
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

  async findAllOpportunities(memberId: string, tenantId: string, page = 1, limit = 10, customerId?: string) {
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

  async findOpportunityById(id: string, memberId: string, tenantId: string) {
    const opportunity = await this.opportunityRepository.findOne({
      where: [
        { id, ownerId: memberId, tenantId }, // 当前用户负责的商机
        { id, ownerId: null, tenantId }      // 公海商机（没有负责人）
      ],
      relations: ['customer', 'activities'],
    });

    if (!opportunity) {
      throw new NotFoundException('商机不存在');
    }

    return opportunity;
  }

  async updateOpportunity(
    id: string,
    updateOpportunityDto: UpdateOpportunityDto,
    memberId: string,
    tenantId: string,
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


  async getOpportunityStats(memberId: string) {
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

  async updateOpportunityStage(id: string, stage: OpportunityStage, memberId: string) {
    // 仅基于memberId校验；如需更严格，可从机会关联的tenantId再比对
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    if (!opportunity) throw new NotFoundException('商机不存在');
    
    opportunity.stage = stage;
    
    // 根据阶段自动设置状态
    if (stage === OpportunityStage.CLOSED) {
      if (opportunity.status === OpportunityStatus.CLOSED_WON) {
        opportunity.actualCloseDate = new Date();
      }
    }

    return await this.opportunityRepository.save(opportunity);
  }

  async closeOpportunity(
    id: string,
    status: OpportunityStatus.CLOSED_WON | OpportunityStatus.CLOSED_LOST,
    memberId: string,
  ) {
    const opportunity = await this.opportunityRepository.findOne({ where: { id } });
    if (!opportunity) throw new NotFoundException('商机不存在');
    
    opportunity.status = status;
    opportunity.stage = OpportunityStage.CLOSED;
    opportunity.actualCloseDate = new Date();

    return await this.opportunityRepository.save(opportunity);
  }

  async deleteOpportunity(id: string, memberId: string, tenantId: string) {
    const opportunity = await this.findOpportunityById(id, memberId, tenantId);
    await this.opportunityRepository.remove(opportunity);
  }

  // 辅助方法：将前端阶段映射到实体阶段
  private mapStageToEntity(stage: string): OpportunityStage {
    const stageMap: Record<string, OpportunityStage> = {
      'lead': OpportunityStage.PROSPECTING,
      'qualification': OpportunityStage.QUALIFICATION,
      'proposal': OpportunityStage.PROPOSAL,
      'negotiation': OpportunityStage.NEGOTIATION,
      'closed_won': OpportunityStage.CLOSED,
      'closed_lost': OpportunityStage.CLOSED,
    };
    return stageMap[stage] || OpportunityStage.PROSPECTING;
  }

  // 辅助方法：将前端阶段映射到实体状态
  private mapStageToStatus(stage: string): OpportunityStatus {
    const statusMap: Record<string, OpportunityStatus> = {
      'lead': OpportunityStatus.QUALIFICATION,
      'qualification': OpportunityStatus.QUALIFICATION,
      'proposal': OpportunityStatus.PROPOSAL_PRICE_QUOTE,
      'negotiation': OpportunityStatus.NEGOTIATION_REVIEW,
      'closed_won': OpportunityStatus.CLOSED_WON,
      'closed_lost': OpportunityStatus.CLOSED_LOST,
    };
    return statusMap[stage] || OpportunityStatus.QUALIFICATION;
  }

  // 辅助方法：将实体阶段映射到前端阶段
  private mapEntityStageToFrontend(stage: OpportunityStage): string {
    const stageMap: Record<OpportunityStage, string> = {
      [OpportunityStage.PROSPECTING]: 'lead',
      [OpportunityStage.QUALIFICATION]: 'qualification',
      [OpportunityStage.PROPOSAL]: 'proposal',
      [OpportunityStage.NEGOTIATION]: 'negotiation',
      [OpportunityStage.CLOSED]: 'closed_won', // 需要根据status进一步判断
    };
    return stageMap[stage] || 'lead';
  }
}
