import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Customer, CustomerStatus } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity, OpportunityStage } from '../../entities/opportunity.entity';
import { Activity } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';

export interface SalesBriefData {
  newCustomers: {
    current: number;
    previous: number;
    changePercent: number;
  };
  newContacts: {
    current: number;
    previous: number;
    changePercent: number;
  };
  newOpportunities: {
    current: number;
    previous: number;
    changePercent: number;
  };
  newActivities: {
    current: number;
    previous: number;
    changePercent: number;
  };
  opportunityAmount: {
    current: number;
    previous: number;
    changePercent: number;
  };
}

export interface DataSummaryData {
  customerSummary: {
    newCustomers: number;
    convertedCustomers: number;
    publicPoolCustomers: number;
    claimedFromPublicPool: number;
  };
  opportunitySummary: {
    newOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    totalAmount: number;
  };
}

export interface CustomerReminderData {
  over7Days: number;
  over15Days: number;
  over30Days: number;
  over3Months: number;
  over6Months: number;
  overdue: number;
}

export interface SalesFunnelData {
  leads: {
    count: number;
    amount: number;
  };
  qualified: {
    count: number;
    amount: number;
  };
  proposal: {
    count: number;
    amount: number;
  };
  negotiation: {
    count: number;
    amount: number;
  };
  closed: {
    count: number;
    amount: number;
  };
}

export interface CustomerSourceDistributionData {
  source: string;
  count: number;
  percentage: number;
}

export interface CustomerMapData {
  province: string;
  count: number;
}

export interface RankingItem {
  memberId: string;
  memberName: string;
  position?: string;
  value: number;
  rank?: number;
  isCurrentUser?: boolean;
}

export interface RankingListData {
  ranking: RankingItem[];
  currentUser: RankingItem | null;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  async getSalesBrief(tenantId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<SalesBriefData> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.getPeriodDates(period);

    // 并行查询所有数据
    const [
      newCustomersCurrent,
      newCustomersPrevious,
      newContactsCurrent,
      newContactsPrevious,
      newOpportunitiesCurrent,
      newOpportunitiesPrevious,
      newActivitiesCurrent,
      newActivitiesPrevious,
      opportunityAmountCurrent,
      opportunityAmountPrevious,
    ] = await Promise.all([
      // 新增客户
      this.customerRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.customerRepository.count({
        where: {
          tenantId,
          createdAt: Between(previousStart, previousEnd),
        },
      }),
      // 新增联系人
      this.contactRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.contactRepository.count({
        where: {
          tenantId,
          createdAt: Between(previousStart, previousEnd),
        },
      }),
      // 新增商机
      this.opportunityRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.opportunityRepository.count({
        where: {
          tenantId,
          createdAt: Between(previousStart, previousEnd),
        },
      }),
      // 新增跟进记录
      this.activityRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.activityRepository.count({
        where: {
          tenantId,
          createdAt: Between(previousStart, previousEnd),
        },
      }),
      // 商机金额
      this.opportunityRepository
        .createQueryBuilder('opportunity')
        .select('COALESCE(SUM(opportunity.amount), 0)', 'total')
        .where('opportunity.tenantId = :tenantId', { tenantId })
        .andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        })
        .getRawOne(),
      this.opportunityRepository
        .createQueryBuilder('opportunity')
        .select('COALESCE(SUM(opportunity.amount), 0)', 'total')
        .where('opportunity.tenantId = :tenantId', { tenantId })
        .andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: previousStart,
          end: previousEnd,
        })
        .getRawOne(),
    ]);

    // 计算变化百分比
    const calculateChangePercent = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      newCustomers: {
        current: newCustomersCurrent,
        previous: newCustomersPrevious,
        changePercent: calculateChangePercent(newCustomersCurrent, newCustomersPrevious),
      },
      newContacts: {
        current: newContactsCurrent,
        previous: newContactsPrevious,
        changePercent: calculateChangePercent(newContactsCurrent, newContactsPrevious),
      },
      newOpportunities: {
        current: newOpportunitiesCurrent,
        previous: newOpportunitiesPrevious,
        changePercent: calculateChangePercent(newOpportunitiesCurrent, newOpportunitiesPrevious),
      },
      newActivities: {
        current: newActivitiesCurrent,
        previous: newActivitiesPrevious,
        changePercent: calculateChangePercent(newActivitiesCurrent, newActivitiesPrevious),
      },
      opportunityAmount: {
        current: parseFloat(opportunityAmountCurrent?.total || '0'),
        previous: parseFloat(opportunityAmountPrevious?.total || '0'),
        changePercent: calculateChangePercent(
          parseFloat(opportunityAmountCurrent?.total || '0'),
          parseFloat(opportunityAmountPrevious?.total || '0'),
        ),
      },
    };
  }

  private getPeriodDates(period: 'week' | 'month' | 'quarter' | 'year') {
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'week':
        // 本周
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        currentStart = currentWeekStart;
        currentEnd = new Date(currentWeekStart);
        currentEnd.setDate(currentWeekStart.getDate() + 6);
        currentEnd.setHours(23, 59, 59, 999);

        // 上周
        previousStart = new Date(currentWeekStart);
        previousStart.setDate(currentWeekStart.getDate() - 7);
        previousEnd = new Date(currentWeekStart);
        previousEnd.setDate(currentWeekStart.getDate() - 1);
        previousEnd.setHours(23, 59, 59, 999);
        break;

      case 'month':
        // 本月
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 上月
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;

      case 'quarter':
        // 本季度
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);

        // 上季度
        const previousQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const previousQuarterYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        previousStart = new Date(previousQuarterYear, previousQuarter * 3, 1);
        previousEnd = new Date(previousQuarterYear, (previousQuarter + 1) * 3, 0, 23, 59, 59, 999);
        break;

      case 'year':
        // 本年
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        // 去年
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  async getDataSummary(tenantId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<DataSummaryData> {
    const { currentStart, currentEnd } = this.getPeriodDates(period);

    // 并行查询所有数据
    const [
      newCustomers,
      convertedCustomers,
      publicPoolCustomers,
      claimedFromPublicPool,
      newOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalAmount,
    ] = await Promise.all([
      // 客户汇总
      this.customerRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.customerRepository.count({
        where: {
          tenantId,
          status: CustomerStatus.CLOSED_WON,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.customerRepository.count({
        where: {
          tenantId,
          status: CustomerStatus.LEAD,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.customerRepository.count({
        where: {
          tenantId,
          status: CustomerStatus.CLOSED_WON,
          updatedAt: Between(currentStart, currentEnd),
        },
      }),
      // 商机汇总
      this.opportunityRepository.count({
        where: {
          tenantId,
          createdAt: Between(currentStart, currentEnd),
        },
      }),
      this.opportunityRepository.count({
        where: {
          tenantId,
          stage: OpportunityStage.CLOSED_WON,
          updatedAt: Between(currentStart, currentEnd),
        },
      }),
      this.opportunityRepository.count({
        where: {
          tenantId,
          stage: OpportunityStage.CLOSED_LOST,
          updatedAt: Between(currentStart, currentEnd),
        },
      }),
      this.opportunityRepository
        .createQueryBuilder('opportunity')
        .select('COALESCE(SUM(opportunity.amount), 0)', 'total')
        .where('opportunity.tenantId = :tenantId', { tenantId })
        .andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        })
        .getRawOne(),
    ]);

    return {
      customerSummary: {
        newCustomers,
        convertedCustomers,
        publicPoolCustomers,
        claimedFromPublicPool,
      },
      opportunitySummary: {
        newOpportunities,
        wonOpportunities,
        lostOpportunities,
        totalAmount: parseFloat(totalAmount?.total || '0'),
      },
    };
  }

  async getCustomerReminders(tenantId: string, memberId?: string): Promise<CustomerReminderData> {
    const now = new Date();
    
    // 计算各个时间节点
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // 构建基础查询条件 - 查询有客户的成员
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.deletedAt IS NULL');

    // 如果指定了成员ID，只查询该成员负责的客户
    if (memberId) {
      baseQuery.andWhere('customer.ownerId = :memberId', { memberId });
    }

    // 获取所有客户ID
    const customers = await baseQuery.select(['customer.id']).getMany();
    const customerIds = customers.map(c => c.id);

    if (customerIds.length === 0) {
      return {
        over7Days: 0,
        over15Days: 0,
        over30Days: 0,
        over3Months: 0,
        over6Months: 0,
        overdue: 0,
      };
    }

    // 并行查询各个时间段的客户数量
    const [
      over7Days,
      over15Days,
      over30Days,
      over3Months,
      over6Months,
      overdue,
    ] = await Promise.all([
      // 超过7天未联系 - 通过活动记录判断
      this.getCustomersWithoutRecentActivity(customerIds, sevenDaysAgo, tenantId),
      
      // 超过15天未联系
      this.getCustomersWithoutRecentActivity(customerIds, fifteenDaysAgo, tenantId),
      
      // 超过30天未联系
      this.getCustomersWithoutRecentActivity(customerIds, thirtyDaysAgo, tenantId),
      
      // 超过3个月未联系
      this.getCustomersWithoutRecentActivity(customerIds, threeMonthsAgo, tenantId),
      
      // 超过6个月未联系
      this.getCustomersWithoutRecentActivity(customerIds, sixMonthsAgo, tenantId),
      
      // 逾期未联系（有计划的联系时间但已过期）
      this.getOverdueCustomers(customerIds, now, tenantId),
    ]);

    return {
      over7Days,
      over15Days,
      over30Days,
      over3Months,
      over6Months,
      overdue,
    };
  }

  // 获取在指定时间后没有活动的客户数量
  private async getCustomersWithoutRecentActivity(customerIds: string[], cutoffDate: Date, tenantId: string): Promise<number> {
    if (customerIds.length === 0) return 0;

    // 查询在指定时间后有活动的客户
    const customersWithActivity = await this.activityRepository
      .createQueryBuilder('activity')
      .select('DISTINCT activity.relatedToId')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.relatedToType = :relatedToType', { relatedToType: 'customer' })
      .andWhere('activity.relatedToId IN (:...customerIds)', { customerIds })
      .andWhere('activity.createdAt >= :cutoffDate', { cutoffDate })
      .andWhere('activity.deletedAt IS NULL')
      .getRawMany();

    const activeCustomerIds = customersWithActivity.map(item => item.activity_relatedToId);
    
    // 返回没有活动的客户数量
    return customerIds.filter(id => !activeCustomerIds.includes(id)).length;
  }

  // 获取逾期未联系的客户数量
  private async getOverdueCustomers(customerIds: string[], now: Date, tenantId: string): Promise<number> {
    if (customerIds.length === 0) return 0;

    // 查询有计划联系时间且已过期的客户
    const overdueCustomers = await this.activityRepository
      .createQueryBuilder('activity')
      .select('DISTINCT activity.relatedToId')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.relatedToType = :relatedToType', { relatedToType: 'customer' })
      .andWhere('activity.relatedToId IN (:...customerIds)', { customerIds })
      .andWhere('activity.plannedStartTime IS NOT NULL')
      .andWhere('activity.plannedStartTime < :now', { now })
      .andWhere('activity.status = :status', { status: 'planned' })
      .andWhere('activity.deletedAt IS NULL')
      .getRawMany();

    return overdueCustomers.length;
  }

  async getSalesFunnel(tenantId: string, memberId?: string): Promise<SalesFunnelData> {
    // 构建基础查询条件 - 基于商机而不是客户
    const baseQuery = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere('opportunity.deletedAt IS NULL');

    // 如果指定了成员ID，只查询该成员负责的商机
    if (memberId) {
      baseQuery.andWhere('opportunity.ownerId = :memberId', { memberId });
    }

    // 并行查询各个阶段的商机数量和金额
    const [
      initialContactData,
      needsAnalysisData,
      proposalQuoteData,
      negotiationReviewData,
      closedWonData,
    ] = await Promise.all([
      // 初步接触阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.INITIAL_CONTACT),
      
      // 需求分析阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.NEEDS_ANALYSIS),
      
      // 方案/报价阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.PROPOSAL_QUOTE),
      
      // 谈判审核阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.NEGOTIATION_REVIEW),
      
      // 赢单阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.CLOSED_WON),
    ]);

    return {
      leads: initialContactData,
      qualified: needsAnalysisData,
      proposal: proposalQuoteData,
      negotiation: negotiationReviewData,
      closed: closedWonData,
    };
  }

  // 获取指定商机阶段的数量和金额
  private async getOpportunityStageData(baseQuery: any, stage: OpportunityStage): Promise<{ count: number; amount: number }> {
    // 获取商机数量
    const count = await baseQuery
      .clone()
      .andWhere('opportunity.stage = :stage', { stage })
      .getCount();

    // 获取该阶段商机的总金额
    const amountResult = await baseQuery
      .clone()
      .select('COALESCE(SUM(opportunity.amount), 0)', 'total')
      .andWhere('opportunity.stage = :stage', { stage })
      .getRawOne();

    const amount = parseFloat(amountResult?.total || '0');

    return { count, amount };
  }

  // 获取指定阶段的客户数量和金额（保留用于其他统计）
  private async getStageData(baseQuery: any, status: CustomerStatus): Promise<{ count: number; amount: number }> {
    // 获取客户数量
    const count = await baseQuery
      .clone()
      .andWhere('customer.status = :status', { status })
      .getCount();

    // 获取该阶段客户的商机总金额
    const amountResult = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoin('opportunity.customer', 'customer')
      .select('COALESCE(SUM(opportunity.amount), 0)', 'total')
      .where('customer.tenantId = :tenantId', { tenantId: baseQuery.getParameters().tenantId })
      .andWhere('customer.status = :status', { status })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('opportunity.deletedAt IS NULL');

    // 如果有成员ID过滤，也要应用到商机查询
    const memberId = baseQuery.getParameters().memberId;
    if (memberId) {
      amountResult.andWhere('customer.ownerId = :memberId', { memberId });
    }

    const amountData = await amountResult.getRawOne();
    const amount = parseFloat(amountData?.total || '0');

    return { count, amount };
  }

  async getCustomerSourceDistribution(tenantId: string, memberId?: string): Promise<CustomerSourceDistributionData[]> {
    // 构建基础查询条件
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.deletedAt IS NULL');

    // 如果指定了成员ID，只查询该成员负责的客户
    if (memberId) {
      baseQuery.andWhere('customer.ownerId = :memberId', { memberId });
    }

    // 查询客户来源分布
    const sourceDistribution = await baseQuery
      .select('customer.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.source')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    // 计算总数
    const totalCount = await baseQuery
      .clone()
      .select('COUNT(*)', 'total')
      .getRawOne();

    const total = parseInt(totalCount?.total || '0');

    // 计算百分比并格式化数据
    const result = sourceDistribution.map(item => ({
      source: item.source || '未设置',
      count: parseInt(item.count),
      percentage: total > 0 ? Math.round((parseInt(item.count) / total) * 100 * 100) / 100 : 0
    }));

    return result;
  }

  /**
   * 获取客户地图数据
   */
  async getCustomerMapData(tenantId: string, memberId?: string): Promise<CustomerMapData[]> {
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.deletedAt IS NULL')
      .andWhere('customer.province IS NOT NULL')
      .andWhere('customer.province != :empty', { empty: '' });

    // 如果指定了成员ID，只查询该成员负责的客户
    if (memberId) {
      baseQuery.andWhere('customer.ownerId = :memberId', { memberId });
    }

    // 查询各省份客户数量
    const provinceData = await baseQuery
      .select('customer.province', 'province')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.province')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    // 格式化数据
    const result = provinceData.map(item => ({
      province: item.province,
      count: parseInt(item.count)
    }));

    return result;
  }

  /**
   * 获取排行榜数据
   */
  async getRankingList(
    tenantId: string,
    memberId: string,
    scope: 'me' | 'all',
    period: 'week' | 'month' | 'quarter' | 'year',
    metric: 'newCustomers' | 'newContacts' | 'newActivities' | 'paymentAmount' | 'contractAmount' | 'contractCount'
  ): Promise<RankingListData> {
    // 计算时间范围
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // 获取成员列表
    let membersQuery = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.tenantId = :tenantId', { tenantId })
      .andWhere('member.deletedAt IS NULL');

    if (scope === 'me') {
      // 只查询当前用户及其下属
      membersQuery = membersQuery.andWhere('member.id = :memberId', { memberId });
    }

    const members = await membersQuery.getMany();
    const memberIds = members.map(m => m.id);

    // 根据指标查询数据
    let rankingData: RankingItem[] = [];

    switch (metric) {
      case 'newCustomers':
        rankingData = await this.getNewCustomersRanking(tenantId, memberIds, startDate);
        break;
      case 'newContacts':
        rankingData = await this.getNewContactsRanking(tenantId, memberIds, startDate);
        break;
      case 'newActivities':
        rankingData = await this.getNewActivitiesRanking(tenantId, memberIds, startDate);
        break;
      case 'paymentAmount':
        rankingData = await this.getPaymentAmountRanking(tenantId, memberIds, startDate);
        break;
      case 'contractAmount':
        rankingData = await this.getContractAmountRanking(tenantId, memberIds, startDate);
        break;
      case 'contractCount':
        rankingData = await this.getContractCountRanking(tenantId, memberIds, startDate);
        break;
    }

    // 添加排名和成员信息
    const membersMap = new Map(members.map(m => [m.id, m]));
    rankingData = rankingData.map((item, index) => {
      const member = membersMap.get(item.memberId);
      return {
        ...item,
        memberName: member?.nickname || member?.user?.username || '未知用户',
        position: member?.position || '销售',
        rank: index + 1,
        isCurrentUser: item.memberId === memberId
      };
    });

    // 找到当前用户排名
    const currentUser = rankingData.find(item => item.isCurrentUser) || null;

    return {
      ranking: rankingData,
      currentUser
    };
  }

  private async getNewCustomersRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    const result = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.ownerId IN (:...memberIds)', { memberIds })
      .andWhere('customer.createdAt >= :startDate', { startDate })
      .andWhere('customer.deletedAt IS NULL')
      .groupBy('customer.ownerId')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return result.map(item => ({
      memberId: item.memberId,
      memberName: '',
      value: parseInt(item.value)
    }));
  }

  private async getNewContactsRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    const result = await this.contactRepository
      .createQueryBuilder('contact')
      .leftJoin('contact.customer', 'customer')
      .select('customer.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value')
      .where('customer.tenantId = :tenantId', { tenantId })
      .andWhere('customer.ownerId IN (:...memberIds)', { memberIds })
      .andWhere('contact.createdAt >= :startDate', { startDate })
      .andWhere('contact.deletedAt IS NULL')
      .groupBy('customer.ownerId')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return result.map(item => ({
      memberId: item.memberId,
      memberName: '',
      value: parseInt(item.value)
    }));
  }

  private async getNewActivitiesRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    const result = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value')
      .where('activity.tenantId = :tenantId', { tenantId })
      .andWhere('activity.ownerId IN (:...memberIds)', { memberIds })
      .andWhere('activity.createdAt >= :startDate', { startDate })
      .andWhere('activity.deletedAt IS NULL')
      .groupBy('activity.ownerId')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return result.map(item => ({
      memberId: item.memberId,
      memberName: '',
      value: parseInt(item.value)
    }));
  }

  private async getPaymentAmountRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的回款表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }

  private async getContractAmountRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的合同表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }

  private async getContractCountRanking(tenantId: string, memberIds: string[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的合同表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }
}
