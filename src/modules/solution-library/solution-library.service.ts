import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  SolutionLibrary,
  SolutionResult,
  SolutionSourceType,
  WinReason,
  LoseReason,
  ProductListItem,
} from '../../entities/solution-library.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { CustomerRequirement, RequirementRelatedType } from '../../entities/customer-requirement.entity';
import { CustomerCompetitor, RelatedType } from '../../entities/customer-competitor.entity';
import { CompetitorAlternative, CompetitorAlternativeRelatedType } from '../../entities/competitor-alternative.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';

export interface CreateSolutionDto {
  title: string;
  industry?: string;
  customerType?: string;
  applicationScenario?: string;
  pricingStrategy?: string;
  serviceStrategy?: string;
  technicalSolution?: string;
  result: SolutionResult;
  winReasons?: WinReason[];
  loseReasons?: LoseReason[];
  keyFeedback?: string;
  lessonsLearned?: string;
}

import {
  CompetitorInfo,
  AlternativeInfo,
} from '../../entities/solution-library.entity';

export interface ExtractedData {
  customer?: Customer;
  opportunity?: Opportunity;
  requirementTags: string[];
  competitorIds: number[];
  competitors?: CompetitorInfo[];
  alternativeIds: number[];
  alternatives?: AlternativeInfo[];
  productList: ProductListItem[];
}

@Injectable()
export class SolutionLibraryService {
  constructor(
    @InjectRepository(SolutionLibrary)
    private readonly solutionRepository: Repository<SolutionLibrary>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(CustomerRequirement)
    private readonly requirementRepository: Repository<CustomerRequirement>,
    @InjectRepository(CustomerCompetitor)
    private readonly competitorRepository: Repository<CustomerCompetitor>,
    @InjectRepository(CompetitorAlternative)
    private readonly alternativeRepository: Repository<CompetitorAlternative>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
  ) {}

  /**
   * 从客户提取数据用于方案沉淀
   */
  async extractCustomerDataForSolution(customerId: number, tenantId: number): Promise<ExtractedData> {
    // 1. 客户基本信息
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 2. 关联的需求（relatedType='customer', relatedId=customerId）
    const requirements = await this.requirementRepository.find({
      where: {
        relatedType: RequirementRelatedType.CUSTOMER,
        relatedId: customerId,
        tenantId,
      },
    });
    const requirementTags = Array.from(
      new Set(requirements.flatMap((r) => r.tags || []))
    );

    // 3. 关联的竞品（relatedType='customer', relatedId=customerId）
    const competitors = await this.competitorRepository.find({
      where: {
        relatedType: RelatedType.CUSTOMER,
        relatedId: customerId,
        tenantId,
      },
    });
    const competitorIds = competitors.map((c) => c.id);
    const competitorInfos: CompetitorInfo[] = competitors.map((c) => ({
      id: c.id,
      manufacturer: c.manufacturer,
      productName: c.productName || undefined,
      annualUsageAmount: c.annualUsageAmount ? Number(c.annualUsageAmount) : undefined,
      unit: c.unit || undefined,
      unitPrice: c.unitPrice ? Number(c.unitPrice) : undefined,
      policy: c.policy || undefined,
      advantages: c.advantages || undefined,
      problems: c.problems || undefined,
    }));

    // 4. 可替代产品（通过竞品ID查找）
    let alternativeIds: number[] = [];
    let alternativeInfos: AlternativeInfo[] = [];
    if (competitorIds.length > 0) {
      const alternatives = await this.alternativeRepository.find({
        where: {
          competitorId: In(competitorIds),
          relatedType: CompetitorAlternativeRelatedType.CUSTOMER,
          relatedId: customerId,
          tenantId,
        },
      });
      alternativeIds = alternatives.map((a) => a.id);
      alternativeInfos = alternatives.map((a) => ({
        id: a.id,
        competitorId: a.competitorId,
        productName: a.productName,
        spec: a.spec || undefined,
        unit: a.unit || undefined,
        unitPrice: a.unitPrice ? Number(a.unitPrice) : undefined,
        annualPotentialAmount: a.annualPotentialAmount ? Number(a.annualPotentialAmount) : undefined,
        advantages: a.advantages || undefined,
        disadvantages: a.disadvantages || undefined,
        strategy: a.strategy || undefined,
        notes: a.notes || undefined,
      }));
    }

    // 5. 最近的报价（关联该客户的商机的报价）
    const opportunities = await this.opportunityRepository.find({
      where: { customerId, tenantId },
    });
    const opportunityIds = opportunities.map((o) => o.id);
    
    let productList: ProductListItem[] = [];
    if (opportunityIds.length > 0) {
      const quotes = await this.quoteRepository.find({
        where: { opportunityId: In(opportunityIds), tenantId },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' },
        take: 1, // 只取最新的报价
      });
      
      if (quotes.length > 0) {
        const latestQuote = quotes[0];
        productList = (latestQuote.items || []).map((item: QuoteItem) => ({
          productId: item.productId,
          productName: (item as any).product?.name || '',
          spec: item.packagingSpec || '',
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          amount: Number(item.amount),
        }));
      }
    }

    return {
      customer,
      requirementTags,
      competitorIds,
      competitors: competitorInfos,
      alternativeIds,
      alternatives: alternativeInfos,
      productList,
    };
  }

  /**
   * 从商机提取数据用于方案沉淀
   */
  async extractOpportunityDataForSolution(opportunityId: number, tenantId: number): Promise<ExtractedData> {
    // 1. 商机基本信息
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId, tenantId },
      relations: ['customer'],
    });

    if (!opportunity) {
      throw new NotFoundException('商机不存在');
    }

    // 2. 关联的需求（relatedType='opportunity', relatedId=opportunityId）
    const requirements = await this.requirementRepository.find({
      where: {
        relatedType: RequirementRelatedType.OPPORTUNITY,
        relatedId: opportunityId,
        tenantId,
      },
    });
    const requirementTags = Array.from(
      new Set(requirements.flatMap((r) => r.tags || []))
    );

    // 3. 关联的竞品（relatedType='opportunity', relatedId=opportunityId）
    const competitors = await this.competitorRepository.find({
      where: {
        relatedType: RelatedType.OPPORTUNITY,
        relatedId: opportunityId,
        tenantId,
      },
    });
    const competitorIds = competitors.map((c) => c.id);
    const competitorInfos: CompetitorInfo[] = competitors.map((c) => ({
      id: c.id,
      manufacturer: c.manufacturer,
      productName: c.productName || undefined,
      annualUsageAmount: c.annualUsageAmount ? Number(c.annualUsageAmount) : undefined,
      unit: c.unit || undefined,
      unitPrice: c.unitPrice ? Number(c.unitPrice) : undefined,
      policy: c.policy || undefined,
      advantages: c.advantages || undefined,
      problems: c.problems || undefined,
    }));

    // 4. 可替代产品
    let alternativeIds: number[] = [];
    let alternativeInfos: AlternativeInfo[] = [];
    if (competitorIds.length > 0) {
      const alternatives = await this.alternativeRepository.find({
        where: {
          competitorId: In(competitorIds),
          relatedType: CompetitorAlternativeRelatedType.OPPORTUNITY,
          relatedId: opportunityId,
          tenantId,
        },
      });
      alternativeIds = alternatives.map((a) => a.id);
      alternativeInfos = alternatives.map((a) => ({
        id: a.id,
        competitorId: a.competitorId,
        productName: a.productName,
        spec: a.spec || undefined,
        unit: a.unit || undefined,
        unitPrice: a.unitPrice ? Number(a.unitPrice) : undefined,
        annualPotentialAmount: a.annualPotentialAmount ? Number(a.annualPotentialAmount) : undefined,
        advantages: a.advantages || undefined,
        disadvantages: a.disadvantages || undefined,
        strategy: a.strategy || undefined,
        notes: a.notes || undefined,
      }));
    }

    // 5. 关联的报价
    const quotes = await this.quoteRepository.find({
      where: { opportunityId, tenantId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      take: 1, // 只取最新的报价
    });

    let productList: ProductListItem[] = [];
    if (quotes.length > 0) {
      const latestQuote = quotes[0];
      productList = (latestQuote.items || []).map((item: QuoteItem) => ({
        productId: item.productId,
        productName: (item as any).product?.name || '',
        spec: item.packagingSpec || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
      }));
    }

    return {
      customer: opportunity.customer,
      opportunity,
      requirementTags,
      competitorIds,
      competitors: competitorInfos,
      alternativeIds,
      alternatives: alternativeInfos,
      productList,
    };
  }

  /**
   * 创建方案（从客户）
   */
  async createSolutionFromCustomer(
    customerId: number,
    dto: CreateSolutionDto,
    memberId: number,
    tenantId: number,
  ): Promise<SolutionLibrary> {
    // 提取数据
    const extractedData = await this.extractCustomerDataForSolution(customerId, tenantId);

    // 自动生成标题（如果没有提供）
    const title = dto.title || this.generateTitleFromCustomer(extractedData.customer!);

    const solution = this.solutionRepository.create({
      tenantId,
      sourceType: SolutionSourceType.CUSTOMER,
      sourceId: customerId,
      title,
      industry: extractedData.customer?.industry || dto.industry,
      customerType: extractedData.customer?.type || dto.customerType,
      applicationScenario: dto.applicationScenario,
      requirementTags: extractedData.requirementTags,
      competitorIds: extractedData.competitorIds,
      competitors: extractedData.competitors,
      alternativeIds: extractedData.alternativeIds,
      alternatives: extractedData.alternatives,
      productList: extractedData.productList,
      pricingStrategy: dto.pricingStrategy,
      serviceStrategy: dto.serviceStrategy,
      technicalSolution: dto.technicalSolution,
      result: dto.result,
      winReasons: dto.winReasons,
      loseReasons: dto.loseReasons,
      keyFeedback: dto.keyFeedback,
      lessonsLearned: dto.lessonsLearned,
      createdBy: memberId,
    });

    return await this.solutionRepository.save(solution);
  }

  /**
   * 创建方案（从商机）
   */
  async createSolutionFromOpportunity(
    opportunityId: number,
    dto: CreateSolutionDto,
    memberId: number,
    tenantId: number,
  ): Promise<SolutionLibrary> {
    // 提取数据
    const extractedData = await this.extractOpportunityDataForSolution(opportunityId, tenantId);

    // 自动生成标题（如果没有提供）
    const title = dto.title || this.generateTitleFromOpportunity(extractedData.opportunity!, extractedData.customer!);

    const solution = this.solutionRepository.create({
      tenantId,
      sourceType: SolutionSourceType.OPPORTUNITY,
      sourceId: opportunityId,
      title,
      industry: extractedData.customer?.industry || dto.industry,
      customerType: extractedData.customer?.type || dto.customerType,
      applicationScenario: dto.applicationScenario,
      requirementTags: extractedData.requirementTags,
      competitorIds: extractedData.competitorIds,
      competitors: extractedData.competitors,
      alternativeIds: extractedData.alternativeIds,
      alternatives: extractedData.alternatives,
      productList: extractedData.productList,
      pricingStrategy: dto.pricingStrategy,
      serviceStrategy: dto.serviceStrategy,
      technicalSolution: dto.technicalSolution,
      result: dto.result,
      winReasons: dto.winReasons,
      loseReasons: dto.loseReasons,
      keyFeedback: dto.keyFeedback,
      lessonsLearned: dto.lessonsLearned,
      createdBy: memberId,
    });

    return await this.solutionRepository.save(solution);
  }

  /**
   * 触发方案创建（从客户）- 用于状态更新时调用
   */
  async triggerSolutionCreationFromCustomer(
    customerId: number,
    memberId: number,
    tenantId: number,
    result: SolutionResult = SolutionResult.LOST,
  ): Promise<{ solutionId: number; extractedData: ExtractedData }> {
    const extractedData = await this.extractCustomerDataForSolution(customerId, tenantId);
    
    // 自动生成标题
    const title = this.generateTitleFromCustomer(extractedData.customer!);

    // 创建方案
    const solution = await this.createSolutionFromCustomer(
      customerId,
      {
        title,
        result,
      },
      memberId,
      tenantId,
    );

    return {
      solutionId: solution.id,
      extractedData,
    };
  }

  /**
   * 触发方案创建（从商机）- 用于阶段更新时调用
   */
  async triggerSolutionCreationFromOpportunity(
    opportunityId: number,
    memberId: number,
    tenantId: number,
    result: SolutionResult = SolutionResult.LOST,
  ): Promise<{ solutionId: number; extractedData: ExtractedData }> {
    const extractedData = await this.extractOpportunityDataForSolution(opportunityId, tenantId);
    
    // 自动生成标题
    const title = this.generateTitleFromOpportunity(extractedData.opportunity!, extractedData.customer!);

    // 创建方案
    const solution = await this.createSolutionFromOpportunity(
      opportunityId,
      {
        title,
        result,
      },
      memberId,
      tenantId,
    );

    return {
      solutionId: solution.id,
      extractedData,
    };
  }

  /**
   * 获取方案详情
   */
  async getSolutionById(id: number, tenantId: number): Promise<SolutionLibrary> {
    const solution = await this.solutionRepository.findOne({
      where: { id, tenantId },
    });

    if (!solution) {
      throw new NotFoundException('方案不存在');
    }

    return solution;
  }

  /**
   * 更新方案
   */
  async updateSolution(
    id: number,
    dto: Partial<CreateSolutionDto>,
    tenantId: number,
  ): Promise<SolutionLibrary> {
    const solution = await this.getSolutionById(id, tenantId);

    Object.assign(solution, dto);
    return await this.solutionRepository.save(solution);
  }

  /**
   * 查询方案列表
   */
  async findAllSolutions(
    query: {
      search?: string;
      industry?: string;
      result?: SolutionResult;
      sourceType?: SolutionSourceType;
      page?: number;
      limit?: number;
    },
    tenantId: number,
  ): Promise<{ list: SolutionLibrary[]; total: number }> {
    const { search, industry, result, sourceType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.solutionRepository
      .createQueryBuilder('solution')
      .where('solution.tenantId = :tenantId', { tenantId })
      .andWhere('solution.deletedAt IS NULL');

    if (search) {
      queryBuilder.andWhere('(solution.title LIKE :search OR solution.applicationScenario LIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (industry) {
      queryBuilder.andWhere('solution.industry = :industry', { industry });
    }

    if (result) {
      queryBuilder.andWhere('solution.result = :result', { result });
    }

    if (sourceType) {
      queryBuilder.andWhere('solution.sourceType = :sourceType', { sourceType });
    }

    queryBuilder.orderBy('solution.createdAt', 'DESC').skip(skip).take(limit);

    const [list, total] = await queryBuilder.getManyAndCount();

    return { list, total };
  }

  /**
   * 删除方案
   */
  async deleteSolution(id: number, tenantId: number): Promise<void> {
    const solution = await this.getSolutionById(id, tenantId);
    solution.deletedAt = new Date();
    await this.solutionRepository.save(solution);
  }

  /**
   * 从客户信息生成标题
   */
  private generateTitleFromCustomer(customer: Customer): string {
    const parts: string[] = [customer.name];
    if (customer.industry) {
      parts.push(customer.industry);
    }
    // 可以添加主要竞品信息
    return parts.join(' - ');
  }

  /**
   * 从商机信息生成标题
   */
  private generateTitleFromOpportunity(opportunity: Opportunity, customer: Customer): string {
    const parts: string[] = [customer.name, opportunity.name];
    if (customer.industry) {
      parts.push(customer.industry);
    }
    return parts.join(' - ');
  }
}

