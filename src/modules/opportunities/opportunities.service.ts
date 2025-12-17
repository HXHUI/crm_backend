import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets, MoreThanOrEqual, Not } from 'typeorm';
import { Opportunity, OpportunityStatus, OpportunityStage } from '../../entities/opportunity.entity';
import { Customer } from '../../entities/customer.entity';
import { Member } from '../../entities/member.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Tenant } from '../../entities/tenant.entity';
import { getConfigFromObject } from '../../common/utils/tenant-config.util';
import { SolutionLibraryService } from '../solution-library/solution-library.service';

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
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(MemberDepartment)
    private readonly memberDepartmentRepository: Repository<MemberDepartment>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly solutionLibraryService: SolutionLibraryService,
  ) {}

  async createOpportunity(createOpportunityDto: CreateOpportunityDto, memberId: number, tenantId: number, departmentId?: number) {
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
      expectedCloseDate: createOpportunityDto.expectedCloseDate 
        ? new Date(createOpportunityDto.expectedCloseDate) 
        : null,
      stage: this.mapStageToEntity(createOpportunityDto.stage || 'lead'),
      status: this.mapStageToStatus(createOpportunityDto.stage || 'lead'),
      customerId: createOpportunityDto.customerId,
      ownerId: memberId, // 当前用户作为负责人
      tenantId,
      departmentId,
      createdBy: memberId,
    });

    const savedOpportunity = await this.opportunityRepository.save(opportunity);
    
    // 加载关联数据
    return await this.opportunityRepository.findOne({
      where: { id: savedOpportunity.id },
      relations: ['customer', 'owner'],
    });
  }

  async findAllOpportunities(
    memberId: number,
    tenantId: number,
    page = 1,
    limit = 50,
    filters?: {
      customerId?: number;
      search?: string;
      stage?: string;
      status?: string;
    }
  ) {
    const { customerId, search, stage, status } = filters || {};
    // 获取当前用户及其下级用户的ID列表
    const allowedOwnerIds = await this.getAllowedOwnerIds(memberId, tenantId);
    
    // 调试日志
    console.log('findAllOpportunities - memberId:', memberId, 'allowedOwnerIds:', allowedOwnerIds);
    
    // 使用 QueryBuilder 来正确构建 OR 条件
    const queryBuilder = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.customer', 'customer')
      .leftJoinAndSelect('opportunity.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere(
        new Brackets((qb) => {
          // 当前用户及其下级用户负责的商机
          if (allowedOwnerIds.length > 0) {
            qb.where('opportunity.ownerId IN (:...allowedOwnerIds)', { allowedOwnerIds });
          }
          // 公海商机（没有负责人）
          if (allowedOwnerIds.length > 0) {
            qb.orWhere('opportunity.ownerId IS NULL');
          } else {
            // 如果没有允许的负责人，只显示公海商机
            qb.where('opportunity.ownerId IS NULL');
          }
        })
      );
    
    // 如果指定了客户ID，添加客户过滤条件
    if (customerId) {
      queryBuilder.andWhere('opportunity.customerId = :customerId', { customerId });
    }

    // 模糊搜索：搜索商机标题或描述
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('opportunity.name LIKE :search', { search: searchTerm })
            .orWhere('opportunity.description LIKE :search', { search: searchTerm });
        })
      );
    }

    // 商机阶段过滤
    if (stage && typeof stage === 'string' && stage.trim()) {
      const stageEnum = this.mapStageToEntity(stage.trim());
      queryBuilder.andWhere('opportunity.stage = :stage', { stage: stageEnum });
    }

    // 商机状态过滤
    if (status && typeof status === 'string' && status.trim()) {
      const statusEnum = this.mapStatusToEntity(status.trim());
      queryBuilder.andWhere('opportunity.status = :status', { status: statusEnum });
    }

    queryBuilder
      .orderBy('opportunity.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [opportunities, total] = await queryBuilder.getManyAndCount();

    // 批量查询部门信息
    const departmentIds = [...new Set(opportunities.map(o => o.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.departmentRepository.find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 转换数据格式以匹配前端期望
    const formattedOpportunities = opportunities.map(opp => {
      const oppDepartmentId = opp.departmentId ? Number(opp.departmentId) : null;
      return {
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
        department: oppDepartmentId && departmentsMap.has(oppDepartmentId)
          ? { id: departmentsMap.get(oppDepartmentId)!.id, name: departmentsMap.get(oppDepartmentId)!.name }
          : null,
        createdAt: opp.createdAt.toISOString(),
        updatedAt: opp.updatedAt.toISOString(),
      };
    });

    return {
      opportunities: formattedOpportunities,
      total,
      page,
      limit,
    };
  }

  async findOpportunityById(id: number, memberId: number, tenantId: number) {
    // 验证参数
    if (!id || isNaN(id) || !tenantId || isNaN(tenantId)) {
      throw new NotFoundException('商机不存在');
    }

    // 获取当前用户及其下级用户的ID列表
    const allowedOwnerIds = await this.getAllowedOwnerIds(memberId, tenantId);
    
    const whereConditions: any[] = [];
    
    // 当前用户及其下级用户负责的商机
    if (allowedOwnerIds.length > 0) {
      whereConditions.push({ id, ownerId: In(allowedOwnerIds), tenantId });
    }
    
    // 公海商机（没有负责人）
    whereConditions.push({ id, ownerId: null, tenantId });

    const opportunity = await this.opportunityRepository.findOne({
      where: whereConditions,
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
      opportunity.expectedCloseDate = updateOpportunityDto.expectedCloseDate 
        ? new Date(updateOpportunityDto.expectedCloseDate) 
        : null;
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

  async updateOpportunityStage(id: number, stage: OpportunityStage, memberId: number, tenantId: number) {
    // 获取当前用户及其下级用户的ID列表
    const allowedOwnerIds = await this.getAllowedOwnerIds(memberId, tenantId);
    
    // 查找商机，检查权限
    const opportunity = await this.opportunityRepository.findOne({ 
      where: { id },
      relations: ['customer', 'owner', 'owner.user']
    });
    
    if (!opportunity) {
      throw new NotFoundException('商机不存在');
    }
    
    // 检查租户权限（处理类型不匹配问题：可能是 bigint、number 或 string）
    const opportunityTenantIdNum = opportunity.tenantId !== null && opportunity.tenantId !== undefined
      ? (typeof opportunity.tenantId === 'bigint' ? Number(opportunity.tenantId) : Number(opportunity.tenantId))
      : null;
    const userTenantIdNum = typeof tenantId === 'bigint' ? Number(tenantId) : Number(tenantId);
    
    if (opportunityTenantIdNum !== userTenantIdNum) {
      console.log('权限检查失败：租户不匹配', {
        opportunityTenantId: opportunity.tenantId,
        opportunityTenantIdNum,
        userTenantId: tenantId,
        userTenantIdNum,
        opportunityTenantIdType: typeof opportunity.tenantId,
        userTenantIdType: typeof tenantId
      });
      throw new ForbiddenException('无权操作此商机');
    }
    
    // 检查负责人权限（允许负责人或其上级操作）
    // 如果是公海商机（没有负责人），允许操作
    if (opportunity.ownerId !== null && opportunity.ownerId !== undefined) {
      // 将 ownerId 和 memberId 都转换为数字进行比较（处理 bigint 类型）
      const ownerIdNum = typeof opportunity.ownerId === 'bigint' 
        ? Number(opportunity.ownerId) 
        : Number(opportunity.ownerId);
      const memberIdNum = typeof memberId === 'bigint' ? Number(memberId) : Number(memberId);
      
      // 首先检查是否是负责人本人（最直接的情况）
      if (ownerIdNum === memberIdNum) {
        console.log('权限检查通过：是商机负责人本人');
        // 直接允许，不需要检查部门关系
      } else {
        // 检查负责人是否在允许列表中（包括部门经理的下级）
        const isOwnerAllowed = allowedOwnerIds.some(id => {
          const idNum = typeof id === 'bigint' ? Number(id) : Number(id);
          return idNum === ownerIdNum;
        });
        
        console.log('权限检查详情:', {
          memberId,
          memberIdNum,
          opportunityOwnerId: opportunity.ownerId,
          ownerIdNum,
          allowedOwnerIds,
          isOwnerAllowed,
          allowedOwnerIdsTypes: allowedOwnerIds.map(id => typeof id),
          ownerIdType: typeof opportunity.ownerId
        });
        
        if (!isOwnerAllowed) {
          console.log('权限检查失败：负责人不在允许列表中');
          throw new ForbiddenException('无权操作此商机');
        }
      }
    } else {
      // 公海商机，允许操作
      console.log('公海商机，允许操作');
    }
    
    const oldStage = opportunity.stage;
    opportunity.stage = stage;
    
    // 根据阶段自动设置状态
    if (stage === OpportunityStage.CLOSED_WON || stage === OpportunityStage.CLOSED_LOST) {
      opportunity.status = OpportunityStatus.CLOSED;
      if (stage === OpportunityStage.CLOSED_WON) {
        opportunity.actualCloseDate = new Date();
      }
    } else {
      // 根据阶段自动设置状态（将枚举值转换为字符串后映射）
      const stageString = stage as string;
      opportunity.status = this.mapStageToStatus(stageString);
    }

    const savedOpportunity = await this.opportunityRepository.save(opportunity);
    
    // 注意：方案沉淀由前端对话框触发，不在这里自动创建
    // 前端会在阶段更新为 CLOSED_LOST 或 CLOSED_WON 时弹出方案沉淀对话框
    
    // 重新加载关联数据
    return await this.opportunityRepository.findOne({
      where: { id: savedOpportunity.id },
      relations: ['customer', 'owner', 'owner.user'],
    });
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

  // 辅助方法：将前端状态映射到实体状态
  private mapStatusToEntity(status: string): OpportunityStatus {
    const statusMap: Record<string, OpportunityStatus> = {
      'active': OpportunityStatus.ACTIVE,
      'waiting_client': OpportunityStatus.WAITING_CLIENT,
      'on_hold': OpportunityStatus.ON_HOLD,
      'at_risk': OpportunityStatus.AT_RISK,
      'closed': OpportunityStatus.CLOSED,
    };
    return statusMap[status] || OpportunityStatus.ACTIVE;
  }

  // 辅助方法：将实体阶段映射到前端阶段
  mapEntityStageToFrontend(stage: OpportunityStage): string {
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
  mapEntityStatusToFrontend(status: OpportunityStatus): string {
    const statusMap: Record<OpportunityStatus, string> = {
      [OpportunityStatus.ACTIVE]: 'active',
      [OpportunityStatus.WAITING_CLIENT]: 'waiting_client',
      [OpportunityStatus.ON_HOLD]: 'on_hold',
      [OpportunityStatus.AT_RISK]: 'at_risk',
      [OpportunityStatus.CLOSED]: 'closed',
    };
    return statusMap[status] || 'active';
  }

  /**
   * 获取允许查看的负责人ID列表（当前用户及其下级用户）
   */
  private async getAllowedOwnerIds(memberId: number, tenantId: number): Promise<number[]> {
    const allowedIds = [memberId]; // 包含当前用户
    
    try {
      // 查找当前用户所在的部门（通过关联查询过滤租户）
      // 注意：member_departments 表的列名是驼峰命名（memberId, departmentId）
      // 使用原始 SQL 查询避免命名策略问题
      const rawResults = await this.memberDepartmentRepository.query(
        `SELECT md.memberId, md.departmentId, md.created_at, md.updated_at, md.deleted_at,
                d.id as department_id, d.name as department_name, d.tenant_id as department_tenant_id,
                d.manager_id as department_manager_id, d.parent_id as department_parent_id
         FROM member_departments md
         LEFT JOIN departments d ON d.id = md.departmentId AND d.deleted_at IS NULL
         WHERE md.memberId = ? AND md.deleted_at IS NULL`,
        [memberId]
      );
      
      // 将原始结果转换为实体对象
      const memberDepartments = rawResults.map((row: any) => ({
        memberId: row.memberId,
        departmentId: row.departmentId,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
        department: row.department_id ? {
          id: row.department_id,
          name: row.department_name,
          tenantId: row.department_tenant_id,
          managerId: row.department_manager_id,
          parentId: row.department_parent_id,
        } : null,
      }));

      // 过滤出当前租户的部门
      const userDepartments = memberDepartments.filter(
        md => md.department && md.department.tenantId === tenantId
      );

      if (userDepartments.length === 0) {
        console.log('getAllowedOwnerIds - 用户不在任何部门，只返回当前用户');
        return allowedIds; // 如果用户不在任何部门，只返回当前用户
      }

      // 收集所有相关部门的ID（包括当前部门及其下级部门）
      const departmentIds = new Set<number>();
      
      const collectDepartmentAndChildren = async (deptId: number) => {
        departmentIds.add(deptId);
        const children = await this.departmentRepository.find({
          where: { parentId: deptId, tenantId },
        });
        for (const child of children) {
          await collectDepartmentAndChildren(child.id);
        }
      };

      for (const md of userDepartments) {
        if (md.department) {
          await collectDepartmentAndChildren(md.department.id);
        }
      }

      // 检查当前用户是否是部门经理
      const isManager = userDepartments.some(
        md => md.department && md.department.managerId === memberId
      );

      console.log('getAllowedOwnerIds - memberId:', memberId, 'isManager:', isManager, 'userDepartments:', userDepartments.map(md => ({ deptId: md.department?.id, deptName: md.department?.name, managerId: md.department?.managerId })));

      if (isManager) {
        // 如果是部门经理，获取所有相关部门的成员ID
        // 使用原始 SQL 查询避免命名策略问题
        const departmentIdsArray = Array.from(departmentIds);
        const placeholders = departmentIdsArray.map(() => '?').join(',');
        const rawResults = await this.memberDepartmentRepository.query(
          `SELECT md.memberId, md.departmentId, md.created_at, md.updated_at, md.deleted_at,
                  d.id as department_id, d.name as department_name, d.tenant_id as department_tenant_id,
                  d.manager_id as department_manager_id, d.parent_id as department_parent_id
           FROM member_departments md
           LEFT JOIN departments d ON d.id = md.departmentId AND d.deleted_at IS NULL
           WHERE md.departmentId IN (${placeholders}) AND md.deleted_at IS NULL`,
          departmentIdsArray
        );
        
        // 将原始结果转换为实体对象
        const allMemberDepartments = rawResults.map((row: any) => ({
          memberId: row.memberId,
          departmentId: row.departmentId,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          deletedAt: row.deleted_at,
          department: row.department_id ? {
            id: row.department_id,
            name: row.department_name,
            tenantId: row.department_tenant_id,
            managerId: row.department_manager_id,
            parentId: row.department_parent_id,
          } : null,
        }));
        
        // 过滤出当前租户的成员部门关系
        const tenantMemberDepartments = allMemberDepartments.filter(
          md => md.department && md.department.tenantId === tenantId
        );
        
        const memberIds = new Set(tenantMemberDepartments.map((md: any) => Number(md.memberId)));
        memberIds.forEach((id: number) => allowedIds.push(id));
        console.log('getAllowedOwnerIds - 部门经理，添加下级成员:', Array.from(memberIds));
      } else {
        console.log('getAllowedOwnerIds - 非部门经理，只返回当前用户');
      }
    } catch (error) {
      console.error('获取允许的负责人ID列表失败:', error);
      // 出错时只返回当前用户
    }

    const result = Array.from(new Set(allowedIds)); // 去重
    console.log('getAllowedOwnerIds - 最终返回的ID列表:', result);
    return result;
  }

  /**
   * 获取即将成交的商机列表
   * @param tenantId 租户ID
   * @param days 提前提醒天数（可选，如果不提供则从租户配置读取）
   * @returns 即将成交的商机列表，包含剩余天数
   */
  async getUpcomingCloseOpportunities(tenantId: number, days?: number) {
    // 验证 tenantId
    if (!tenantId || isNaN(tenantId)) {
      return [];
    }

    // 获取租户配置
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'config'],
    });

    const config = getConfigFromObject(tenant?.config);
    const reminderDays = days ?? config.opportunityCloseReminderDays;

    // 计算日期范围：今天到未来N天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + reminderDays);
    endDate.setHours(23, 59, 59, 999);

    // 查询即将成交的商机
    // 只查询状态为 active 且未关闭的商机
    // 使用 QueryBuilder 来避免 Not(In(...)) 可能的问题
    const opportunities = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .leftJoinAndSelect('opportunity.customer', 'customer')
      .leftJoinAndSelect('opportunity.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere('opportunity.expectedCloseDate >= :today', { today })
      .andWhere('opportunity.status = :status', { status: OpportunityStatus.ACTIVE })
      .andWhere('opportunity.stage NOT IN (:...stages)', { stages: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST] })
      .orderBy('opportunity.expectedCloseDate', 'ASC')
      .getMany();

    // 过滤出在提醒范围内的商机，并计算剩余天数
    const now = new Date();
    const upcomingOpportunities = opportunities
      .filter(opportunity => {
        if (!opportunity.expectedCloseDate) return false;
        const closeDate = new Date(opportunity.expectedCloseDate);
        closeDate.setHours(0, 0, 0, 0);
        return closeDate >= today && closeDate <= endDate;
      })
      .map(opportunity => {
        const closeDate = new Date(opportunity.expectedCloseDate!);
        closeDate.setHours(0, 0, 0, 0);
        const diffTime = closeDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...opportunity,
          daysRemaining: diffDays,
        };
      });

    return upcomingOpportunities;
  }
}
