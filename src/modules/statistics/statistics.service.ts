import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { Customer, CustomerStatus } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity, OpportunityStage } from '../../entities/opportunity.entity';
import { Activity } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';
import { Order, OrderStatus } from '../../entities/order.entity';
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Lead } from '../../entities/lead.entity';

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
  contractAmount: {
    current: number;
    previous: number;
    changePercent: number;
  };
  orderAmount: {
    current: number;
    previous: number;
    changePercent: number;
  };
}

export interface SalesBriefTrendData {
  [key: string]: {
    months: string[];
    values: number[];
  };
}

export interface DataSummaryData {
  customerSummary: {
    newCustomers: number;
    convertedCustomers: number;
    publicPoolCustomers: number;
    claimedFromPublicPool: number;
    totalCustomers: number;
    unconvertedCustomers: number;
    convertedCustomersTotal: number;
  };
  opportunitySummary: {
    newOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    totalAmount: number;
  };
  contractSummary: {
    signedContracts: number;
    expiringSoon: number;
    expired: number;
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

export interface OpportunityStageDistributionData {
  initialContact: {
    count: number;
    amount: number;
  };
  needsAnalysis: {
    count: number;
    amount: number;
  };
  proposalQuote: {
    count: number;
    amount: number;
  };
  negotiationReview: {
    count: number;
    amount: number;
  };
  closedWon: {
    count: number;
    amount: number;
  };
  closedLost: {
    count: number;
    amount: number;
  };
}

export interface CustomerConversionFunnelData {
  leads: {
    count: number;
  };
  converted: {
    count: number;
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
  closedWon: {
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

export interface CustomerCityMapData {
  province: string;
  city: string;
  count: number;
}

export interface RankingItem {
  memberId: number;
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

export interface DailySalesStatsData {
  today: {
    amount: number;
    count: number;
  };
  yesterday: {
    amount: number;
    count: number;
  };
  lastWeekSameDay: {
    amount: number;
    count: number;
  };
  lastYearSameDay: {
    amount: number;
    count: number;
  };
  yearOverYear: {
    amount: number;
    percent: number;
  };
  dayOverDay: {
    amount: number;
    percent: number;
  };
  weekOverWeek: {
    amount: number;
    percent: number;
  };
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
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(MemberDepartment)
    private memberDepartmentRepository: Repository<MemberDepartment>,
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  /**
   * 构建租户查询条件（支持单租户或多租户）
   * @param queryBuilder 查询构建器
   * @param alias 表别名
   * @param tenantIds 租户ID数组
   */
  private buildTenantCondition<T>(
    queryBuilder: SelectQueryBuilder<T>,
    alias: string,
    tenantIds: number[],
  ): SelectQueryBuilder<T> {
    if (tenantIds.length === 1) {
      return queryBuilder.andWhere(`${alias}.tenantId = :tenantId`, { tenantId: tenantIds[0] });
    } else {
      return queryBuilder.andWhere(`${alias}.tenantId IN (:...tenantIds)`, { tenantIds });
    }
  }

  /**
   * 获取同级部门ID列表
   */
  private async getSiblingDepartmentIds(departmentId: number, tenantId: number): Promise<number[]> {
    const department = await this.departmentRepository.findOne({
      where: { id: departmentId, tenantId } as any,
    });
    if (!department) {
      return [];
    }
    // 获取同一父部门下的所有部门（同级部门）
    const siblingDepartments = await this.departmentRepository.find({
      where: { parentId: department.parentId, tenantId } as any,
    });
    return siblingDepartments.map(d => d.id);
  }

  /**
   * 获取同部门同级用户ID列表
   */
  private async getSiblingMemberIds(memberId: number, tenantId: number): Promise<number[]> {
    // 获取成员所属的部门
    const memberDepartments = await this.memberDepartmentRepository.find({
      where: { memberId } as any,
    });
    if (memberDepartments.length === 0) {
      return [memberId]; // 如果没有部门，只返回自己
    }
    // 获取所有部门下的成员（同部门成员）
    const departmentIds = memberDepartments.map(md => md.departmentId);
    const allMembers = await this.memberDepartmentRepository.find({
      where: { departmentId: In(departmentIds) } as any,
    });
    return [...new Set(allMembers.map(md => md.memberId))];
  }

  /**
   * 根据部门ID获取该部门及其所有子部门的成员ID列表
   * @param departmentId 部门ID
   * @param tenantId 租户ID
   */
  private async getDepartmentMemberIds(departmentId: number, tenantId: number): Promise<number[]> {
    // 1. 递归获取所有子部门ID
    const getAllSubDepartmentIds = async (parentIds: number[]): Promise<number[]> => {
      if (parentIds.length === 0) return [];
      
      const subDepartments = await this.departmentRepository.find({
        where: { parentId: In(parentIds), tenantId },
      });
      
      if (subDepartments.length === 0) return [];
      
      const subDepartmentIds = subDepartments.map(d => d.id);
      const deeperSubIds = await getAllSubDepartmentIds(subDepartmentIds);
      
      return [...subDepartmentIds, ...deeperSubIds];
    };
    
    const allDepartmentIds = [departmentId];
    const subDepartmentIds = await getAllSubDepartmentIds([departmentId]);
    allDepartmentIds.push(...subDepartmentIds);
    
    // 2. 获取所有这些部门下的所有成员ID
    const memberDepartments = await this.memberDepartmentRepository.find({
      where: { departmentId: In(allDepartmentIds) },
    });
    
    return [...new Set(memberDepartments.map(md => md.memberId))];
  }

  /**
   * 根据过滤条件获取成员ID列表
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  private async getFilteredMemberIds(
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[] | undefined> {
    if (scopeType === 'all') {
      return undefined; // 全部，不限制成员
    }
    
    if (scopeType === 'member' && memberId) {
      return [memberId];
    }
    
    if (scopeType === 'department' && departmentId && tenantId) {
      return await this.getDepartmentMemberIds(departmentId, tenantId);
    }
    
    // me_and_subordinates: 返回当前用户及其下级用户
    if (scopeType === 'me_and_subordinates' && currentMemberId && tenantId) {
      const memberIds: number[] = [currentMemberId];
      
      // 获取当前用户作为负责人的部门
      const managedDepartments = await this.departmentRepository.find({
        where: { managerId: currentMemberId, tenantId },
      });
      
      if (managedDepartments.length > 0) {
        // 递归获取所有子部门ID
        const getAllSubDepartmentIds = async (parentIds: number[]): Promise<number[]> => {
          if (parentIds.length === 0) return [];
          
          const subDepartments = await this.departmentRepository.find({
            where: { parentId: In(parentIds), tenantId },
          });
          
          if (subDepartments.length === 0) return [];
          
          const subDepartmentIds = subDepartments.map(d => d.id);
          const deeperSubIds = await getAllSubDepartmentIds(subDepartmentIds);
          
          return [...subDepartmentIds, ...deeperSubIds];
        };
        
        const allDepartmentIds = new Set<number>();
        managedDepartments.forEach(dept => allDepartmentIds.add(dept.id));
        
        const departmentIdsArray = Array.from(allDepartmentIds);
        const subDepartmentIds = await getAllSubDepartmentIds(departmentIdsArray);
        departmentIdsArray.forEach(id => allDepartmentIds.add(id));
        subDepartmentIds.forEach(id => allDepartmentIds.add(id));
        
        // 获取所有这些部门下的所有成员ID
        if (allDepartmentIds.size > 0) {
          const subordinateMembers = await this.memberDepartmentRepository.find({
            where: { departmentId: In(Array.from(allDepartmentIds)) },
          });
          subordinateMembers.forEach(sm => {
            if (!memberIds.includes(sm.memberId)) {
              memberIds.push(sm.memberId);
            }
          });
        }
      }
      
      return memberIds;
    }
    
    return undefined;
  }


  /**
   * 获取销售简报数据（支持多租户）
   * @param tenantIds 租户ID数组
   * @param period 时间周期
   */
  async getSalesBriefForTenants(
    tenantIds: number[],
    period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    startDate?: string,
    endDate?: string,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<SalesBriefData> {
    const { currentStart, currentEnd, previousStart, previousEnd } = this.getPeriodDates(period, startDate, endDate);
    
    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    // 构建成员过滤条件
    const buildMemberCondition = (whereClause: any) => {
      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          // 如果没有匹配的成员，返回一个永远不匹配的条件
          return { ...whereClause, ownerId: -1 };
        }
        return { ...whereClause, ownerId: In(filteredMemberIds) };
      }
      return whereClause;
    };

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
      contractAmountCurrent,
      contractAmountPrevious,
      orderAmountCurrent,
      orderAmountPrevious,
    ] = await Promise.all([
      // 新增客户
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(previousStart, previousEnd),
        }),
      }),
      // 新增联系人（需要通过客户关联）
      (() => {
        const qb = this.contactRepository
          .createQueryBuilder('contact')
          .leftJoin('contact.customer', 'customer');
        this.buildTenantCondition(qb, 'contact', tenantIds);
        qb.andWhere('contact.createdAt BETWEEN :start AND :end', { start: currentStart, end: currentEnd });
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getCount();
      })(),
      (() => {
        const qb = this.contactRepository
          .createQueryBuilder('contact')
          .leftJoin('contact.customer', 'customer');
        this.buildTenantCondition(qb, 'contact', tenantIds);
        qb.andWhere('contact.createdAt BETWEEN :start AND :end', { start: previousStart, end: previousEnd });
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getCount();
      })(),
      // 新增商机
      this.opportunityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.opportunityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(previousStart, previousEnd),
        }),
      }),
      // 新增跟进记录
      this.activityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.activityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(previousStart, previousEnd),
        }),
      }),
      // 商机金额
      (() => {
        const qb = this.opportunityRepository
          .createQueryBuilder('opportunity')
          .select('COALESCE(SUM(opportunity.amount), 0)', 'total');
        this.buildTenantCondition(qb, 'opportunity', tenantIds);
        qb.andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        });
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      (() => {
        const qb = this.opportunityRepository
          .createQueryBuilder('opportunity')
          .select('COALESCE(SUM(opportunity.amount), 0)', 'total');
        this.buildTenantCondition(qb, 'opportunity', tenantIds);
        qb.andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: previousStart,
          end: previousEnd,
        });
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      // 合同金额（基于签署日期）
      (() => {
        const qb = this.contractRepository
          .createQueryBuilder('contract')
          .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
        this.buildTenantCondition(qb, 'contract', tenantIds);
        qb.andWhere('contract.signDate BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        })
        .andWhere('contract.deletedAt IS NULL');
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('contract.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      (() => {
        const qb = this.contractRepository
          .createQueryBuilder('contract')
          .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
        this.buildTenantCondition(qb, 'contract', tenantIds);
        qb.andWhere('contract.signDate BETWEEN :start AND :end', {
          start: previousStart,
          end: previousEnd,
        })
        .andWhere('contract.deletedAt IS NULL');
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('contract.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      // 订单金额（基于下单日期）
      (() => {
        const qb = this.orderRepository
          .createQueryBuilder('order')
          .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
        this.buildTenantCondition(qb, 'order', tenantIds);
        qb.andWhere('order.orderDate BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        })
        .andWhere('order.deletedAt IS NULL');
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('order.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      (() => {
        const qb = this.orderRepository
          .createQueryBuilder('order')
          .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
        this.buildTenantCondition(qb, 'order', tenantIds);
        qb.andWhere('order.orderDate BETWEEN :start AND :end', {
          start: previousStart,
          end: previousEnd,
        })
        .andWhere('order.deletedAt IS NULL');
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('order.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
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
      contractAmount: {
        current: parseFloat(contractAmountCurrent?.total || '0'),
        previous: parseFloat(contractAmountPrevious?.total || '0'),
        changePercent: calculateChangePercent(
          parseFloat(contractAmountCurrent?.total || '0'),
          parseFloat(contractAmountPrevious?.total || '0'),
        ),
      },
      orderAmount: {
        current: parseFloat(orderAmountCurrent?.total || '0'),
        previous: parseFloat(orderAmountPrevious?.total || '0'),
        changePercent: calculateChangePercent(
          parseFloat(orderAmountCurrent?.total || '0'),
          parseFloat(orderAmountPrevious?.total || '0'),
        ),
      },
    };
  }

  /**
   * 获取销售简报数据（保持向后兼容）
   * @param tenantId 租户ID
   * @param period 时间周期
   */
  async getSalesBrief(tenantId: number, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<SalesBriefData> {
    return this.getSalesBriefForTenants([tenantId], period);
  }

  /**
   * 获取销售简报近6个月趋势数据（支持多租户）
   * @param tenantIds 租户ID数组
   */
  async getSalesBriefTrendForTenants(tenantIds: number[]): Promise<SalesBriefTrendData> {
    const now = new Date();
    const months: string[] = [];
    const monthStarts: Date[] = [];
    const monthEnds: Date[] = [];

    // 生成近6个月的日期范围
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getMonth() + 1}月`);
      monthStarts.push(new Date(date.getFullYear(), date.getMonth(), 1));
      monthEnds.push(new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    // 并行查询每个月的各项指标
    const monthlyData = await Promise.all(
      monthStarts.map((start, index) => {
        const end = monthEnds[index];
        return Promise.all([
          // 新增客户
          this.customerRepository.count({
            where: {
              tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
              createdAt: Between(start, end),
            },
          }),
          // 新增联系人
          this.contactRepository.count({
            where: {
              tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
              createdAt: Between(start, end),
            },
          }),
          // 新增商机
          this.opportunityRepository.count({
            where: {
              tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
              createdAt: Between(start, end),
            },
          }),
          // 新增跟进记录
          this.activityRepository.count({
            where: {
              tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
              createdAt: Between(start, end),
            },
          }),
          // 商机金额
          (() => {
            const qb = this.opportunityRepository
              .createQueryBuilder('opportunity')
              .select('COALESCE(SUM(opportunity.amount), 0)', 'total');
            this.buildTenantCondition(qb, 'opportunity', tenantIds);
            return qb
              .andWhere('opportunity.createdAt BETWEEN :start AND :end', { start, end })
              .getRawOne();
          })(),
          // 合同金额（基于签署日期）
          (() => {
            const qb = this.contractRepository
              .createQueryBuilder('contract')
              .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
            this.buildTenantCondition(qb, 'contract', tenantIds);
            return qb
              .andWhere('contract.signDate BETWEEN :start AND :end', { start, end })
              .andWhere('contract.deletedAt IS NULL')
              .getRawOne();
          })(),
          // 订单金额（基于下单日期）
          (() => {
            const qb = this.orderRepository
              .createQueryBuilder('order')
              .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
            this.buildTenantCondition(qb, 'order', tenantIds);
            return qb
              .andWhere('order.orderDate BETWEEN :start AND :end', { start, end })
              .andWhere('order.deletedAt IS NULL')
              .getRawOne();
          })(),
        ]);
      })
    );

    // 组织数据
    const newCustomersValues: number[] = [];
    const newContactsValues: number[] = [];
    const newOpportunitiesValues: number[] = [];
    const newActivitiesValues: number[] = [];
    const opportunityAmountValues: number[] = [];
    const contractAmountValues: number[] = [];
    const orderAmountValues: number[] = [];

    monthlyData.forEach((monthData) => {
      newCustomersValues.push(monthData[0]);
      newContactsValues.push(monthData[1]);
      newOpportunitiesValues.push(monthData[2]);
      newActivitiesValues.push(monthData[3]);
      opportunityAmountValues.push(parseFloat(monthData[4]?.total || '0'));
      contractAmountValues.push(parseFloat(monthData[5]?.total || '0'));
      orderAmountValues.push(parseFloat(monthData[6]?.total || '0'));
    });

    return {
      newCustomers: {
        months,
        values: newCustomersValues,
      },
      newContacts: {
        months,
        values: newContactsValues,
      },
      newOpportunities: {
        months,
        values: newOpportunitiesValues,
      },
      newActivities: {
        months,
        values: newActivitiesValues,
      },
      opportunityAmount: {
        months,
        values: opportunityAmountValues,
      },
      contractAmount: {
        months,
        values: contractAmountValues,
      },
      orderAmount: {
        months,
        values: orderAmountValues,
      },
    };
  }

  private getPeriodDates(
    period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom',
    startDate?: string,
    endDate?: string,
  ) {
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

      case 'last_week':
        // 上周
        const lastWeekStart = new Date(now);
        lastWeekStart.setDate(now.getDate() - now.getDay() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        currentStart = lastWeekStart;
        currentEnd = new Date(lastWeekStart);
        currentEnd.setDate(lastWeekStart.getDate() + 6);
        currentEnd.setHours(23, 59, 59, 999);

        // 上上周
        previousStart = new Date(lastWeekStart);
        previousStart.setDate(lastWeekStart.getDate() - 7);
        previousEnd = new Date(lastWeekStart);
        previousEnd.setDate(lastWeekStart.getDate() - 1);
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

      case 'last_month':
        // 上月
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // 上上月
        previousStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
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

      case 'last_quarter':
        // 上季度
        const lastQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarterNum = lastQuarter === 0 ? 3 : lastQuarter - 1;
        const lastQuarterYear = lastQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        currentStart = new Date(lastQuarterYear, lastQuarterNum * 3, 1);
        currentEnd = new Date(lastQuarterYear, (lastQuarterNum + 1) * 3, 0, 23, 59, 59, 999);

        // 上上季度
        const prevLastQuarter = lastQuarterNum === 0 ? 3 : lastQuarterNum - 1;
        const prevLastQuarterYear = lastQuarterNum === 0 ? lastQuarterYear - 1 : lastQuarterYear;
        previousStart = new Date(prevLastQuarterYear, prevLastQuarter * 3, 1);
        previousEnd = new Date(prevLastQuarterYear, (prevLastQuarter + 1) * 3, 0, 23, 59, 59, 999);
        break;

      case 'year':
        // 本年
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        // 去年
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;

      case 'last_year':
        // 去年
        currentStart = new Date(now.getFullYear() - 1, 0, 1);
        currentEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

        // 前年
        previousStart = new Date(now.getFullYear() - 2, 0, 1);
        previousEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
        break;

      case 'custom':
        // 自定义日期范围
        if (startDate && endDate) {
          currentStart = new Date(startDate);
          currentStart.setHours(0, 0, 0, 0);
          currentEnd = new Date(endDate);
          currentEnd.setHours(23, 59, 59, 999);

          // 计算上一个相同长度的周期
          const daysDiff = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
          previousEnd = new Date(currentStart);
          previousEnd.setDate(previousEnd.getDate() - 1);
          previousEnd.setHours(23, 59, 59, 999);
          previousStart = new Date(previousEnd);
          previousStart.setDate(previousStart.getDate() - daysDiff);
          previousStart.setHours(0, 0, 0, 0);
        } else {
          // 如果没有提供日期，默认使用本月
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
          currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }
        break;
    }

    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  /**
   * 获取数据汇总（支持多租户）
   * @param tenantIds 租户ID数组
   * @param period 时间周期
   */
  async getDataSummaryForTenants(
    tenantIds: number[],
    period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    startDate?: string,
    endDate?: string,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<DataSummaryData> {
    const { currentStart, currentEnd } = this.getPeriodDates(period, startDate, endDate);
    
    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 构建成员过滤条件
    const buildMemberCondition = (whereClause: any) => {
      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          return { ...whereClause, ownerId: -1 };
        }
        return { ...whereClause, ownerId: In(filteredMemberIds) };
      }
      return whereClause;
    };

    // 计算合同相关日期
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

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
      totalCustomers,
      unconvertedCustomers,
      convertedCustomersTotal,
      signedContracts,
      expiringSoon,
      expired,
      contractTotalAmount,
    ] = await Promise.all([
      // 客户汇总
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: CustomerStatus.CLOSED_WON,
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: CustomerStatus.LEAD,
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: CustomerStatus.CLOSED_WON,
          updatedAt: Between(currentStart, currentEnd),
        }),
      }),
      // 商机汇总
      this.opportunityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          createdAt: Between(currentStart, currentEnd),
        }),
      }),
      this.opportunityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          stage: OpportunityStage.CLOSED_WON,
          updatedAt: Between(currentStart, currentEnd),
        }),
      }),
      this.opportunityRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          stage: OpportunityStage.CLOSED_LOST,
          updatedAt: Between(currentStart, currentEnd),
        }),
      }),
      (() => {
        const qb = this.opportunityRepository
          .createQueryBuilder('opportunity')
          .select('COALESCE(SUM(opportunity.amount), 0)', 'total');
        this.buildTenantCondition(qb, 'opportunity', tenantIds);
        qb.andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: currentStart,
          end: currentEnd,
        });
        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        }
        return qb.getRawOne();
      })(),
      // 累计客户数
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          deletedAt: null as any,
        }),
      }),
      // 未成交客户数
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: Not(CustomerStatus.CLOSED_WON),
          deletedAt: null as any,
        }),
      }),
      // 累计成交客户数
      this.customerRepository.count({
        where: buildMemberCondition({
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: CustomerStatus.CLOSED_WON,
          deletedAt: null as any,
        }),
      }),
      // 合同汇总 - 签约合同数量（状态为 SIGNED 或 ACTIVE）
      this.contractRepository.count({
        where: {
          tenantId: tenantIds.length === 1 ? tenantIds[0] : In(tenantIds),
          status: In([ContractStatus.SIGNED, ContractStatus.ACTIVE]),
          deletedAt: null as any,
        },
      }),
      // 合同汇总 - 即将到期（未来七天到期，且状态为 ACTIVE 或 SIGNED）
      (() => {
        const qb = this.contractRepository.createQueryBuilder('contract');
        this.buildTenantCondition(qb, 'contract', tenantIds);
        return qb
          .andWhere('contract.expiryDate >= :today', { today })
          .andWhere('contract.expiryDate <= :sevenDaysLater', { sevenDaysLater })
          .andWhere('contract.status IN (:...statuses)', { 
            statuses: [ContractStatus.SIGNED, ContractStatus.ACTIVE] 
          })
          .andWhere('contract.deletedAt IS NULL')
          .getCount();
      })(),
      // 合同汇总 - 已到期（到期日期小于今天，且状态不是 TERMINATED，或者状态为 EXPIRED）
      (() => {
        const qb = this.contractRepository.createQueryBuilder('contract');
        this.buildTenantCondition(qb, 'contract', tenantIds);
        return qb
          .andWhere(
            '(contract.expiryDate IS NOT NULL AND contract.expiryDate < :today AND contract.status != :terminated) OR contract.status = :expired',
            { 
              today, 
              terminated: ContractStatus.TERMINATED,
              expired: ContractStatus.EXPIRED
            }
          )
          .andWhere('contract.deletedAt IS NULL')
          .getCount();
      })(),
      // 合同汇总 - 合同金额（状态为 SIGNED 或 ACTIVE 的合同总金额）
      (() => {
        const qb = this.contractRepository
          .createQueryBuilder('contract')
          .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
        this.buildTenantCondition(qb, 'contract', tenantIds);
        return qb
          .andWhere('contract.status IN (:...statuses)', { 
            statuses: [ContractStatus.SIGNED, ContractStatus.ACTIVE] 
          })
          .andWhere('contract.deletedAt IS NULL')
          .getRawOne();
      })(),
    ]);

    return {
      customerSummary: {
        newCustomers,
        convertedCustomers,
        publicPoolCustomers,
        claimedFromPublicPool,
        totalCustomers,
        unconvertedCustomers,
        convertedCustomersTotal,
      },
      opportunitySummary: {
        newOpportunities,
        wonOpportunities,
        lostOpportunities,
        totalAmount: parseFloat(totalAmount?.total || '0'),
      },
      contractSummary: {
        signedContracts,
        expiringSoon,
        expired,
        totalAmount: parseFloat(contractTotalAmount?.total || '0'),
      },
    };
  }


  /**
   * 获取数据汇总（保持向后兼容）
   * @param tenantId 租户ID
   * @param period 时间周期
   */
  async getDataSummary(tenantId: number, period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<DataSummaryData> {
    return this.getDataSummaryForTenants([tenantId], period);
  }

  /**
   * 获取客户遗忘提醒（支持多租户）
   * @param tenantIds 租户ID数组
   * @param memberId 成员ID（可选）
   */
  async getCustomerRemindersForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<CustomerReminderData> {
    const now = new Date();
    
    // 计算各个时间节点
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 构建基础查询条件 - 查询有客户的成员
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer');
    this.buildTenantCondition(baseQuery, 'customer', tenantIds);
    baseQuery.andWhere('customer.deletedAt IS NULL');

    // 如果指定了成员过滤，只查询匹配的客户
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
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
      this.getCustomersWithoutRecentActivity(customerIds, sevenDaysAgo, tenantIds),
      
      // 超过15天未联系
      this.getCustomersWithoutRecentActivity(customerIds, fifteenDaysAgo, tenantIds),
      
      // 超过30天未联系
      this.getCustomersWithoutRecentActivity(customerIds, thirtyDaysAgo, tenantIds),
      
      // 超过3个月未联系
      this.getCustomersWithoutRecentActivity(customerIds, threeMonthsAgo, tenantIds),
      
      // 超过6个月未联系
      this.getCustomersWithoutRecentActivity(customerIds, sixMonthsAgo, tenantIds),
      
      // 逾期未联系（有计划的联系时间但已过期）
      this.getOverdueCustomers(customerIds, now, tenantIds),
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

  /**
   * 获取客户遗忘提醒（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选）
   */
  async getCustomerReminders(tenantId: number, memberId?: number): Promise<CustomerReminderData> {
    const scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = memberId ? 'member' : 'all';
    return this.getCustomerRemindersForTenants([tenantId], scopeType, undefined, memberId, memberId, tenantId);
  }

  // 获取在指定时间后没有活动的客户数量（支持多租户）
  private async getCustomersWithoutRecentActivity(customerIds: number[], cutoffDate: Date, tenantIds: number[]): Promise<number> {
    if (customerIds.length === 0) return 0;

    // 查询在指定时间后有活动的客户
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .select('DISTINCT activity.relatedToId');
    this.buildTenantCondition(qb, 'activity', tenantIds);
    const customersWithActivity = await qb
      .andWhere('activity.relatedToType = :relatedToType', { relatedToType: 'customer' })
      .andWhere('activity.relatedToId IN (:...customerIds)', { customerIds })
      .andWhere('activity.createdAt >= :cutoffDate', { cutoffDate })
      .andWhere('activity.deletedAt IS NULL')
      .getRawMany();

    const activeCustomerIds = customersWithActivity.map(item => item.activity_relatedToId);
    
    // 返回没有活动的客户数量
    return customerIds.filter(id => !activeCustomerIds.includes(id)).length;
  }

  // 获取逾期未联系的客户数量（支持多租户）
  private async getOverdueCustomers(customerIds: number[], now: Date, tenantIds: number[]): Promise<number> {
    if (customerIds.length === 0) return 0;

    // 查询有计划联系时间且已过期的客户
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .select('DISTINCT activity.relatedToId');
    this.buildTenantCondition(qb, 'activity', tenantIds);
    const overdueCustomers = await qb
      .andWhere('activity.relatedToType = :relatedToType', { relatedToType: 'customer' })
      .andWhere('activity.relatedToId IN (:...customerIds)', { customerIds })
      .andWhere('activity.plannedStartTime IS NOT NULL')
      .andWhere('activity.plannedStartTime < :now', { now })
      .andWhere('activity.status = :status', { status: 'planned' })
      .andWhere('activity.deletedAt IS NULL')
      .getRawMany();

    return overdueCustomers.length;
  }

  /**
   * 获取销售漏斗（支持多租户）
   * @param tenantIds 租户ID数组
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getSalesFunnelForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<SalesFunnelData> {
    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 构建基础查询条件 - 基于商机而不是客户
    const baseQuery = this.opportunityRepository
      .createQueryBuilder('opportunity');
    this.buildTenantCondition(baseQuery, 'opportunity', tenantIds);
    baseQuery.andWhere('opportunity.deletedAt IS NULL');

    // 如果指定了成员过滤，只查询匹配的商机
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
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

  /**
   * 获取销售漏斗（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选）
   */
  async getSalesFunnel(tenantId: number, memberId?: number): Promise<SalesFunnelData> {
    const scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = memberId ? 'member' : 'all';
    return this.getSalesFunnelForTenants([tenantId], scopeType, undefined, memberId, memberId, tenantId);
  }

  /**
   * 获取商机阶段分布（支持多租户）
   * @param tenantIds 租户ID数组
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getOpportunityStageDistributionForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<OpportunityStageDistributionData> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    // 构建基础查询
    const baseQuery = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.deletedAt IS NULL');

    // 应用租户过滤
    this.buildTenantCondition(baseQuery, 'opportunity', tenantIds);

    // 应用成员过滤
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }

    // 并行查询各个阶段的商机数量和金额（包括输单）
    const [
      initialContactData,
      needsAnalysisData,
      proposalQuoteData,
      negotiationReviewData,
      closedWonData,
      closedLostData,
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
      
      // 输单阶段
      this.getOpportunityStageData(baseQuery.clone(), OpportunityStage.CLOSED_LOST),
    ]);

    return {
      initialContact: initialContactData,
      needsAnalysis: needsAnalysisData,
      proposalQuote: proposalQuoteData,
      negotiationReview: negotiationReviewData,
      closedWon: closedWonData,
      closedLost: closedLostData,
    };
  }

  /**
   * 获取客户转化漏斗（支持多租户）
   * @param tenantIds 租户ID数组
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getCustomerConversionFunnelForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<CustomerConversionFunnelData> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    // 1. 获取线索总数
    const leadQuery = this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.deletedAt IS NULL');
    
    this.buildTenantCondition(leadQuery, 'lead', tenantIds);
    
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        leadQuery.andWhere('1 = 0');
      } else {
        leadQuery.andWhere('lead.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }
    
    const leadsCount = await leadQuery.getCount();

    // 2. 获取已转化客户数（从线索转化的客户）
    const convertedQuery = this.customerRepository
      .createQueryBuilder('customer')
      .innerJoin('leads', 'lead', 'lead.convertedCustomerId = customer.id')
      .where('customer.deletedAt IS NULL')
      .andWhere('lead.deletedAt IS NULL');
    
    this.buildTenantCondition(convertedQuery, 'customer', tenantIds);
    
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        convertedQuery.andWhere('1 = 0');
      } else {
        convertedQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }
    
    const convertedCount = await convertedQuery.getCount();

    // 3. 获取客户各状态数据
    const customerBaseQuery = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.deletedAt IS NULL');
    
    this.buildTenantCondition(customerBaseQuery, 'customer', tenantIds);
    
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        customerBaseQuery.andWhere('1 = 0');
      } else {
        customerBaseQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }

    // 并行查询各状态客户数据
    const [
      qualifiedData,
      proposalData,
      negotiationData,
      closedWonData,
    ] = await Promise.all([
      // 合格客户
      this.getCustomerStatusData(customerBaseQuery.clone(), CustomerStatus.QUALIFIED),
      // 提案客户
      this.getCustomerStatusData(customerBaseQuery.clone(), CustomerStatus.PROPOSAL),
      // 谈判客户
      this.getCustomerStatusData(customerBaseQuery.clone(), CustomerStatus.NEGOTIATION),
      // 成交客户
      this.getCustomerStatusData(customerBaseQuery.clone(), CustomerStatus.CLOSED_WON),
    ]);

    return {
      leads: {
        count: leadsCount,
      },
      converted: {
        count: convertedCount,
      },
      qualified: qualifiedData,
      proposal: proposalData,
      negotiation: negotiationData,
      closedWon: closedWonData,
    };
  }

  /**
   * 获取指定状态的客户数量和金额
   */
  private async getCustomerStatusData(
    baseQuery: any,
    status: CustomerStatus,
  ): Promise<{ count: number; amount: number }> {
    // 获取客户数量
    const count = await baseQuery
      .clone()
      .andWhere('customer.status = :status', { status })
      .getCount();

    // 获取该状态客户的预计价值总和
    const amountResult = await baseQuery
      .clone()
      .select('COALESCE(SUM(customer.estimatedValue), 0)', 'total')
      .andWhere('customer.status = :status', { status })
      .getRawOne();

    const amount = parseFloat(amountResult?.total || '0');

    return { count, amount };
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

  /**
   * 获取客户来源分布（支持多租户）
   * @param tenantIds 租户ID数组
   * @param memberId 成员ID（可选）
   */
  async getCustomerSourceDistributionForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<CustomerSourceDistributionData[]> {
    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 构建基础查询条件
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer');
    this.buildTenantCondition(baseQuery, 'customer', tenantIds);
    baseQuery.andWhere('customer.deletedAt IS NULL');

    // 如果指定了成员过滤，只查询匹配的客户
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
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
   * 获取客户来源分布（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选）
   */
  async getCustomerSourceDistribution(tenantId: number, memberId?: number): Promise<CustomerSourceDistributionData[]> {
    const scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = memberId ? 'member' : 'all';
    return this.getCustomerSourceDistributionForTenants([tenantId], scopeType, undefined, memberId, memberId, tenantId);
  }

  /**
   * 获取客户地图数据（支持多租户）
   * @param tenantIds 租户ID数组
   * @param memberId 成员ID（可选）
   */
  async getCustomerMapDataForTenants(
    tenantIds: number[], 
    onlyConverted: boolean = false,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<CustomerMapData[]> {
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer');
    this.buildTenantCondition(baseQuery, 'customer', tenantIds);
    baseQuery.andWhere('customer.deletedAt IS NULL')
      .andWhere('customer.province IS NOT NULL')
      .andWhere('customer.province != :empty', { empty: '' });

    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 如果指定了成员过滤，只查询匹配的客户
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }

    // 如果只查询已成交客户
    if (onlyConverted) {
      baseQuery.andWhere('customer.status = :status', { status: CustomerStatus.CLOSED_WON });
    }

    // 查询各省份客户数量
    const provinceData = await baseQuery
      .select('customer.province', 'province')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.province')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    // 格式化数据
    const result = provinceData.map(item => {
      const count = parseInt(item.count || '0', 10);
      return {
        province: item.province,
        count: isNaN(count) ? 0 : count
      };
    });

    return result;
  }

  /**
   * 获取客户城市分布数据（支持多租户）
   * @param tenantIds 租户ID数组
   * @param onlyConverted 是否只查询已成交客户
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getCustomerCityMapDataForTenants(
    tenantIds: number[],
    onlyConverted: boolean = false,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<CustomerCityMapData[]> {
    const baseQuery = this.customerRepository
      .createQueryBuilder('customer');
    this.buildTenantCondition(baseQuery, 'customer', tenantIds);
    baseQuery.andWhere('customer.deletedAt IS NULL')
      .andWhere('customer.province IS NOT NULL')
      .andWhere('customer.province != :empty', { empty: '' })
      .andWhere('customer.city IS NOT NULL')
      .andWhere('customer.city != :emptyCity', { emptyCity: '' });

    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 如果指定了成员过滤，只查询匹配的客户
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        baseQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        baseQuery.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }

    // 如果只查询已成交客户
    if (onlyConverted) {
      baseQuery.andWhere('customer.status = :status', { status: CustomerStatus.CLOSED_WON });
    }

    // 查询各省市客户数量
    const cityData = await baseQuery
      .select('customer.province', 'province')
      .addSelect('customer.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.province')
      .addGroupBy('customer.city')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    // 格式化数据
    const result = cityData.map(item => {
      const count = parseInt(item.count || '0', 10);
      return {
        province: item.province,
        city: item.city,
        count: isNaN(count) ? 0 : count
      };
    });

    return result;
  }

  /**
   * 获取客户地图数据（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选）
   */
  async getCustomerMapData(tenantId: number, memberId?: number): Promise<CustomerMapData[]> {
    const scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = memberId ? 'member' : 'all';
    return this.getCustomerMapDataForTenants(
      [tenantId], 
      false, 
      scopeType,
      undefined,
      memberId,
      memberId,
      tenantId,
    );
  }

  /**
   * 获取排行榜数据（支持多租户）
   * @param tenantIds 租户ID数组
   * @param memberId 成员ID
   * @param scope 范围
   * @param period 周期
   * @param metric 指标
   */
  async getRankingListForTenants(
    tenantIds: number[],
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    metric: 'newCustomers' | 'newContacts' | 'newActivities' | 'paymentAmount' | 'contractAmount' | 'contractCount' = 'newCustomers',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<RankingListData> {
    // 计算时间范围
    let startDateDate: Date;
    let endDateDate: Date;
    
    if (period === 'custom' && startDate && endDate) {
      startDateDate = new Date(startDate);
      endDateDate = new Date(endDate);
      endDateDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
        case 'last_week':
          startDateDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
        case 'last_month':
          startDateDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
        case 'quarter':
        case 'last_quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDateDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
        case 'last_year':
          startDateDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDateDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      endDateDate = new Date(now);
      endDateDate.setHours(23, 59, 59, 999);
    }

    // 根据过滤条件获取成员ID列表
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );
    
    // 获取成员列表（从所有租户中获取）
    let membersQuery = this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user');
    if (tenantIds.length === 1) {
      membersQuery = membersQuery.where('member.tenantId = :tenantId', { tenantId: tenantIds[0] });
    } else {
      membersQuery = membersQuery.where('member.tenantId IN (:...tenantIds)', { tenantIds });
    }
    membersQuery = membersQuery.andWhere('member.deletedAt IS NULL');

    // 如果指定了成员过滤，只查询匹配的成员
    if (filteredMemberIds !== undefined) {
      if (filteredMemberIds.length === 0) {
        membersQuery = membersQuery.andWhere('1 = 0'); // 永远不匹配
      } else {
        membersQuery = membersQuery.andWhere('member.id IN (:...memberIds)', { memberIds: filteredMemberIds });
      }
    }

    const members = await membersQuery.getMany();
    const memberIds = members.map(m => m.id);

    // 根据指标查询数据
    let rankingData: RankingItem[] = [];

    switch (metric) {
      case 'newCustomers':
        rankingData = await this.getNewCustomersRanking(tenantIds, memberIds, startDateDate);
        break;
      case 'newContacts':
        rankingData = await this.getNewContactsRanking(tenantIds, memberIds, startDateDate);
        break;
      case 'newActivities':
        rankingData = await this.getNewActivitiesRanking(tenantIds, memberIds, startDateDate);
        break;
      case 'paymentAmount':
        rankingData = await this.getPaymentAmountRanking(tenantIds, memberIds, startDateDate);
        break;
      case 'contractAmount':
        rankingData = await this.getContractAmountRanking(tenantIds, memberIds, startDateDate);
        break;
      case 'contractCount':
        rankingData = await this.getContractCountRanking(tenantIds, memberIds, startDateDate);
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
        isCurrentUser: currentMemberId ? item.memberId === currentMemberId : false
      };
    });

    // 找到当前用户排名
    const currentUser = currentMemberId ? rankingData.find(item => item.isCurrentUser) || null : null;

    return {
      ranking: rankingData,
      currentUser
    };
  }

  /**
   * 获取排行榜数据（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID
   * @param scope 范围
   * @param period 周期
   * @param metric 指标
   */
  async getRankingList(
    tenantId: number,
    memberId: number,
    scope: 'me' | 'all',
    period: 'week' | 'month' | 'quarter' | 'year',
    metric: 'newCustomers' | 'newContacts' | 'newActivities' | 'paymentAmount' | 'contractAmount' | 'contractCount'
  ): Promise<RankingListData> {
    const scopeType: 'me_and_subordinates' | 'all' = scope === 'all' ? 'all' : 'me_and_subordinates';
    return this.getRankingListForTenants(
      [tenantId], 
      scopeType, 
      period, 
      metric,
      undefined,
      undefined,
      memberId,
      tenantId,
    );
  }

  private async getNewCustomersRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    const qb = this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value');
    this.buildTenantCondition(qb, 'customer', tenantIds);
    const result = await qb
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

  private async getNewContactsRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .leftJoin('contact.customer', 'customer')
      .select('customer.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value');
    this.buildTenantCondition(qb, 'customer', tenantIds);
    const result = await qb
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

  private async getNewActivitiesRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    const qb = this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.ownerId', 'memberId')
      .addSelect('COUNT(*)', 'value');
    this.buildTenantCondition(qb, 'activity', tenantIds);
    const result = await qb
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

  private async getPaymentAmountRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的回款表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }

  private async getContractAmountRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的合同表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }

  private async getContractCountRanking(tenantIds: number[], memberIds: number[], startDate: Date): Promise<RankingItem[]> {
    // 这里需要根据实际的合同表结构来实现
    // 暂时返回空数组，需要根据业务需求实现
    return [];
  }

  /**
   * 获取今日销售额统计（包含同比、环比）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选，用于筛选特定成员的订单）
   */
  /**
   * 获取今日销售额统计（支持多租户）
   * @param tenantIds 租户ID数组
   * @param memberId 成员ID（可选）
   */
  async getDailySalesStatsForTenants(tenantIds: number[], memberId?: number): Promise<DailySalesStatsData> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    const lastWeekSameDay = new Date(today);
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
    const lastWeekSameDayEnd = new Date(lastWeekSameDay);
    lastWeekSameDayEnd.setHours(23, 59, 59, 999);

    const lastYearSameDay = new Date(today);
    lastYearSameDay.setFullYear(lastYearSameDay.getFullYear() - 1);
    const lastYearSameDayEnd = new Date(lastYearSameDay);
    lastYearSameDayEnd.setHours(23, 59, 59, 999);

    // 构建基础查询
    const buildQuery = (startDate: Date, endDate: Date) => {
      let query = this.orderRepository
        .createQueryBuilder('order');
      this.buildTenantCondition(query, 'order', tenantIds);
      query = query
        .andWhere('order.orderDate >= :startDate', { startDate })
        .andWhere('order.orderDate <= :endDate', { endDate })
        .andWhere('order.status != :cancelledStatus', { cancelledStatus: OrderStatus.CANCELLED })
        .andWhere('order.deletedAt IS NULL');

      if (memberId) {
        query = query.andWhere('order.ownerId = :memberId', { memberId });
      }

      return query;
    };

    // 并行查询今日、昨日、上周同日、去年同期订单
    const [todayOrders, yesterdayOrders, lastWeekOrders, lastYearOrders] = await Promise.all([
      buildQuery(today, todayEnd)
        .select('SUM(order.totalAmount)', 'totalAmount')
        .addSelect('COUNT(order.id)', 'count')
        .getRawOne(),
      buildQuery(yesterday, yesterdayEnd)
        .select('SUM(order.totalAmount)', 'totalAmount')
        .addSelect('COUNT(order.id)', 'count')
        .getRawOne(),
      buildQuery(lastWeekSameDay, lastWeekSameDayEnd)
        .select('SUM(order.totalAmount)', 'totalAmount')
        .addSelect('COUNT(order.id)', 'count')
        .getRawOne(),
      buildQuery(lastYearSameDay, lastYearSameDayEnd)
        .select('SUM(order.totalAmount)', 'totalAmount')
        .addSelect('COUNT(order.id)', 'count')
        .getRawOne(),
    ]);

    // 解析结果
    const todayAmount = parseFloat(todayOrders?.totalAmount || '0') || 0;
    const todayCount = parseInt(todayOrders?.count || '0', 10) || 0;

    const yesterdayAmount = parseFloat(yesterdayOrders?.totalAmount || '0') || 0;
    const yesterdayCount = parseInt(yesterdayOrders?.count || '0', 10) || 0;

    const lastWeekAmount = parseFloat(lastWeekOrders?.totalAmount || '0') || 0;
    const lastWeekCount = parseInt(lastWeekOrders?.count || '0', 10) || 0;

    const lastYearAmount = parseFloat(lastYearOrders?.totalAmount || '0') || 0;
    const lastYearCount = parseInt(lastYearOrders?.count || '0', 10) || 0;

    // 计算环比（与昨日对比）
    const dayOverDayAmount = todayAmount - yesterdayAmount;
    const dayOverDayPercent = yesterdayAmount > 0 
      ? ((todayAmount - yesterdayAmount) / yesterdayAmount) * 100 
      : (todayAmount > 0 ? 100 : 0);

    // 计算周环比（与上周同日对比）
    const weekOverWeekAmount = todayAmount - lastWeekAmount;
    const weekOverWeekPercent = lastWeekAmount > 0 
      ? ((todayAmount - lastWeekAmount) / lastWeekAmount) * 100 
      : (todayAmount > 0 ? 100 : 0);

    // 计算同比（与去年同期对比）
    const yearOverYearAmount = todayAmount - lastYearAmount;
    const yearOverYearPercent = lastYearAmount > 0 
      ? ((todayAmount - lastYearAmount) / lastYearAmount) * 100 
      : (todayAmount > 0 ? 100 : 0);

    return {
      today: {
        amount: todayAmount,
        count: todayCount,
      },
      yesterday: {
        amount: yesterdayAmount,
        count: yesterdayCount,
      },
      lastWeekSameDay: {
        amount: lastWeekAmount,
        count: lastWeekCount,
      },
      lastYearSameDay: {
        amount: lastYearAmount,
        count: lastYearCount,
      },
      yearOverYear: {
        amount: yearOverYearAmount,
        percent: yearOverYearPercent,
      },
      dayOverDay: {
        amount: dayOverDayAmount,
        percent: dayOverDayPercent,
      },
      weekOverWeek: {
        amount: weekOverWeekAmount,
        percent: weekOverWeekPercent,
      },
    };
  }

  /**
   * 获取今日销售额统计（保持向后兼容）
   * @param tenantId 租户ID
   * @param memberId 成员ID（可选）
   */
  async getDailySalesStats(tenantId: number, memberId?: number): Promise<DailySalesStatsData> {
    return this.getDailySalesStatsForTenants([tenantId], memberId);
  }

  /**
   * 获取本年度各月份合同金额（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyContractAmountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyAmounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.contractRepository
        .createQueryBuilder('contract')
        .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
      
      this.buildTenantCondition(qb, 'contract', tenantIds);
      qb.andWhere('contract.status IN (:...statuses)', { 
        statuses: [ContractStatus.SIGNED, ContractStatus.ACTIVE] 
      })
      .andWhere('contract.deletedAt IS NULL')
      .andWhere('contract.signDate BETWEEN :start AND :end', {
        start: monthStart,
        end: monthEnd,
      });

      // 如果指定了成员过滤，使用合同的负责人ID来过滤
      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        } else {
          qb.andWhere('contract.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyAmounts[month] = parseFloat(result?.total || '0');
    }

    return monthlyAmounts;
  }

  /**
   * 获取本年度各月份订单金额（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyOrderAmountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyAmounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.orderRepository
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
      
      this.buildTenantCondition(qb, 'order', tenantIds);
      qb.andWhere('order.deletedAt IS NULL')
        .andWhere('order.orderDate BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        });

      // 如果指定了成员过滤，使用订单的负责人ID来过滤
      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0'); // 永远不匹配
        } else {
          qb.andWhere('order.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyAmounts[month] = parseFloat(result?.total || '0');
    }

    return monthlyAmounts;
  }

  /**
   * 获取合同金额排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getContractAmountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalAmount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // 根据范围类型决定查询哪些部门或成员
    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      // 如果选择部门，比对同级部门
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      // 如果选择用户，比对同部门同级用户
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      // 确保包含当前用户
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      // 如果选择本人及下属，只查询当前用户及其下属成员
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else {
      // 其他情况（all 或未指定），查询所有
      let ownerTypeFilter: 'department' | 'member' | undefined;
      if (scopeType === 'department') {
        ownerTypeFilter = 'department';
      } else if (scopeType === 'member') {
        ownerTypeFilter = 'member';
      }
      
      if (ownerTypeFilter === 'department' || !ownerTypeFilter) {
        const depts = await this.departmentRepository.find({
          where: { tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }

      if (ownerTypeFilter === 'member' || !ownerTypeFilter) {
        const members = await this.memberRepository.find({
          where: { tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    // 计算每个所有者的合同金额
    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.contractRepository
          .createQueryBuilder('contract')
          .select('COALESCE(SUM(contract.totalAmount), 0)', 'total');
        
        this.buildTenantCondition(qb, 'contract', tenantIds);
        qb.andWhere('contract.status IN (:...statuses)', { 
          statuses: [ContractStatus.SIGNED, ContractStatus.ACTIVE] 
        })
        .andWhere('contract.deletedAt IS NULL')
        .andWhere('contract.signDate BETWEEN :start AND :end', {
          start: yearStart,
          end: yearEnd,
        });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('contract.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalAmount: parseFloat(result?.total || '0'),
        };
      })
    );

    // 按实际金额降序排序
    return results.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * 获取订单金额排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getOrderAmountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalAmount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // 根据范围类型决定查询哪些部门或成员
    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      // 如果选择部门，比对同级部门
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      // 如果选择用户，比对同部门同级用户
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      // 确保包含当前用户
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      // 如果选择本人及下属，只查询当前用户及其下属成员
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else {
      // 其他情况（all 或未指定），查询所有
      let ownerTypeFilter: 'department' | 'member' | undefined;
      if (scopeType === 'department') {
        ownerTypeFilter = 'department';
      } else if (scopeType === 'member') {
        ownerTypeFilter = 'member';
      }
      
      if (ownerTypeFilter === 'department' || !ownerTypeFilter) {
        const depts = await this.departmentRepository.find({
          where: { tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }

      if (ownerTypeFilter === 'member' || !ownerTypeFilter) {
        const members = await this.memberRepository.find({
          where: { tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    // 计算每个所有者的订单金额
    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.orderRepository
          .createQueryBuilder('order')
          .select('COALESCE(SUM(order.totalAmount), 0)', 'total');
        
        this.buildTenantCondition(qb, 'order', tenantIds);
        qb.andWhere('order.deletedAt IS NULL')
          .andWhere('order.orderDate BETWEEN :start AND :end', {
            start: yearStart,
            end: yearEnd,
          });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('order.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalAmount: parseFloat(result?.total || '0'),
        };
      })
    );

    // 按实际金额降序排序
    return results.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * 获取本年度各月份新增线索数（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyLeadCountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyCounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.leadRepository
        .createQueryBuilder('lead')
        .select('COUNT(lead.id)', 'count');
      
      this.buildTenantCondition(qb, 'lead', tenantIds);
      qb.andWhere('lead.deletedAt IS NULL')
        .andWhere('lead.createdAt BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        });

      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('lead.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyCounts[month] = parseInt(result?.count || '0', 10);
    }

    return monthlyCounts;
  }

  /**
   * 获取本年度各月份新增客户数（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyCustomerCountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyCounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.customerRepository
        .createQueryBuilder('customer')
        .select('COUNT(customer.id)', 'count');
      
      this.buildTenantCondition(qb, 'customer', tenantIds);
      qb.andWhere('customer.deletedAt IS NULL')
        .andWhere('customer.createdAt BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        });

      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyCounts[month] = parseInt(result?.count || '0', 10);
    }

    return monthlyCounts;
  }

  /**
   * 获取本年度各月份新增商机数（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyOpportunityCountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyCounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.opportunityRepository
        .createQueryBuilder('opportunity')
        .select('COUNT(opportunity.id)', 'count');
      
      this.buildTenantCondition(qb, 'opportunity', tenantIds);
      qb.andWhere('opportunity.deletedAt IS NULL')
        .andWhere('opportunity.createdAt BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        });

      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyCounts[month] = parseInt(result?.count || '0', 10);
    }

    return monthlyCounts;
  }

  /**
   * 获取本年度各月份赢单商机数（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyWonOpportunityCountForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<number[]> {
    const filteredMemberIds = await this.getFilteredMemberIds(
      scopeType,
      departmentId,
      memberId,
      currentMemberId,
      tenantId,
    );

    const monthlyCounts = Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const qb = this.opportunityRepository
        .createQueryBuilder('opportunity')
        .select('COUNT(opportunity.id)', 'count');
      
      this.buildTenantCondition(qb, 'opportunity', tenantIds);
      qb.andWhere('opportunity.deletedAt IS NULL')
        .andWhere('opportunity.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
        .andWhere('opportunity.updatedAt BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        });

      if (filteredMemberIds !== undefined) {
        if (filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        }
      }

      const result = await qb.getRawOne();
      monthlyCounts[month] = parseInt(result?.count || '0', 10);
    }

    return monthlyCounts;
  }

  /**
   * 获取新增线索数排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getLeadCountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalCount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // 根据范围类型决定查询哪些部门或成员
    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    if (owners.length === 0) {
      return [];
    }

    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.leadRepository
          .createQueryBuilder('lead')
          .select('COUNT(lead.id)', 'count');
        
        this.buildTenantCondition(qb, 'lead', tenantIds);
        qb.andWhere('lead.deletedAt IS NULL')
          .andWhere('lead.createdAt BETWEEN :start AND :end', {
            start: yearStart,
            end: yearEnd,
          });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('lead.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalCount: parseInt(result?.count || '0', 10),
        };
      })
    );

    return results.sort((a, b) => b.totalCount - a.totalCount);
  }

  /**
   * 获取新增客户数排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getCustomerCountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalCount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    if (owners.length === 0) {
      return [];
    }

    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.customerRepository
          .createQueryBuilder('customer')
          .select('COUNT(customer.id)', 'count');
        
        this.buildTenantCondition(qb, 'customer', tenantIds);
        qb.andWhere('customer.deletedAt IS NULL')
          .andWhere('customer.createdAt BETWEEN :start AND :end', {
            start: yearStart,
            end: yearEnd,
          });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('customer.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalCount: parseInt(result?.count || '0', 10),
        };
      })
    );

    return results.sort((a, b) => b.totalCount - a.totalCount);
  }

  /**
   * 获取新增商机数排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getOpportunityCountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalCount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    if (owners.length === 0) {
      return [];
    }

    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.opportunityRepository
          .createQueryBuilder('opportunity')
          .select('COUNT(opportunity.id)', 'count');
        
        this.buildTenantCondition(qb, 'opportunity', tenantIds);
        qb.andWhere('opportunity.deletedAt IS NULL')
          .andWhere('opportunity.createdAt BETWEEN :start AND :end', {
            start: yearStart,
            end: yearEnd,
          });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalCount: parseInt(result?.count || '0', 10),
        };
      })
    );

    return results.sort((a, b) => b.totalCount - a.totalCount);
  }

  /**
   * 获取赢单商机数排行榜（支持多租户）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getWonOpportunityCountRankingForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<Array<{ ownerType: string; ownerId: number; ownerName: string; totalCount: number }>> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    let owners: Array<{ id: number; name: string; type: 'department' | 'member' }> = [];
    
    if (scopeType === 'department' && departmentId) {
      const siblingDeptIds = await this.getSiblingDepartmentIds(departmentId, tenantIds[0]);
      if (siblingDeptIds.length > 0) {
        const depts = await this.departmentRepository.find({
          where: { id: In(siblingDeptIds), tenantId: tenantIds[0] } as any,
          select: { id: true, name: true } as any,
        });
        depts.forEach(d => owners.push({ id: d.id as any, name: d.name as any, type: 'department' }));
      }
    } else if (scopeType === 'member' && memberId) {
      const siblingMemberIds = await this.getSiblingMemberIds(memberId, tenantIds[0]);
      const allMemberIds = [...new Set([...siblingMemberIds, memberId])];
      if (allMemberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(allMemberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    } else if (scopeType === 'me_and_subordinates' && currentMemberId) {
      const memberIds = await this.getFilteredMemberIds('me_and_subordinates', undefined, undefined, currentMemberId, tenantIds[0]);
      if (memberIds && memberIds.length > 0) {
        const members = await this.memberRepository.find({
          where: { id: In(memberIds), tenantId: tenantIds[0] } as any,
          relations: ['user'],
          select: { id: true, nickname: true, user: { username: true } } as any,
        });
        members.forEach((m: any) => owners.push({
          id: m.id,
          name: m.nickname || m.user?.username || String(m.id),
          type: 'member',
        }));
      }
    }

    if (owners.length === 0) {
      return [];
    }

    const results = await Promise.all(
      owners.map(async (owner) => {
        let filteredMemberIds: number[] | undefined;
        
        if (owner.type === 'department') {
          filteredMemberIds = await this.getDepartmentMemberIds(owner.id, tenantIds[0]);
        } else {
          filteredMemberIds = [owner.id];
        }

        const qb = this.opportunityRepository
          .createQueryBuilder('opportunity')
          .select('COUNT(opportunity.id)', 'count');
        
        this.buildTenantCondition(qb, 'opportunity', tenantIds);
        qb.andWhere('opportunity.deletedAt IS NULL')
          .andWhere('opportunity.stage = :stage', { stage: OpportunityStage.CLOSED_WON })
          .andWhere('opportunity.updatedAt BETWEEN :start AND :end', {
            start: yearStart,
            end: yearEnd,
          });

        if (filteredMemberIds !== undefined && filteredMemberIds.length > 0) {
          qb.andWhere('opportunity.ownerId IN (:...memberIds)', { memberIds: filteredMemberIds });
        } else if (filteredMemberIds !== undefined && filteredMemberIds.length === 0) {
          qb.andWhere('1 = 0');
        }

        const result = await qb.getRawOne();
        return {
          ownerType: owner.type,
          ownerId: owner.id,
          ownerName: owner.name,
          totalCount: parseInt(result?.count || '0', 10),
        };
      })
    );

    return results.sort((a, b) => b.totalCount - a.totalCount);
  }

  /**
   * 获取本年度各月份合同金额（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyContractAmountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyContractAmountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyContractAmountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }

  /**
   * 获取本年度各月份订单金额（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyOrderAmountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyOrderAmountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyOrderAmountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }

  /**
   * 获取本年度各月份新增线索数（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyLeadCountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyLeadCountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyLeadCountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }

  /**
   * 获取本年度各月份新增客户数（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyCustomerCountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyCustomerCountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyCustomerCountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }

  /**
   * 获取本年度各月份新增商机数（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyOpportunityCountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyOpportunityCountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyOpportunityCountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }

  /**
   * 获取本年度各月份赢单商机数（含同比数据）
   * @param tenantIds 租户ID数组
   * @param year 年份
   * @param scopeType 范围类型
   * @param departmentId 部门ID（可选）
   * @param memberId 成员ID（可选）
   * @param currentMemberId 当前成员ID
   * @param tenantId 租户ID
   */
  async getMonthlyWonOpportunityCountWithYearOverYearForTenants(
    tenantIds: number[],
    year: number,
    scopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = 'me_and_subordinates',
    departmentId?: number,
    memberId?: number,
    currentMemberId?: number,
    tenantId?: number,
  ): Promise<{ current: number[]; yearOverYear: number[] }> {
    const [current, yearOverYear] = await Promise.all([
      this.getMonthlyWonOpportunityCountForTenants(
        tenantIds,
        year,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
      this.getMonthlyWonOpportunityCountForTenants(
        tenantIds,
        year - 1,
        scopeType,
        departmentId,
        memberId,
        currentMemberId,
        tenantId,
      ),
    ]);
    return { current, yearOverYear };
  }
}
