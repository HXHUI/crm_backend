import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository, MoreThanOrEqual, LessThan, In, Between } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { Customer, CustomerType } from '../../entities/customer.entity';
import { Contact, ContactType } from '../../entities/contact.entity';
import { Opportunity, OpportunityStage, OpportunityStatus } from '../../entities/opportunity.entity';
import { Activity, ActivityType, ActivityStatus, RelatedToType } from '../../entities/activity.entity';
import { Visit, VisitType, VisitStatus, VisitPurpose } from '../../entities/visit.entity';
import { Member } from '../../entities/member.entity';
import { Department } from '../../entities/department.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { NotificationHelper } from '../notifications/utils/notification-helper';

export interface CreateLeadDto {
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  status?: LeadStatus;
  rating?: 'hot' | 'warm' | 'cold';
  industry?: string;
  level?: string;
  province?: string;
  city?: string;
  district?: string;
  addressDetail?: string;
  ownerId?: number | string | null; // 负责人ID，null表示没有负责人（线索池），undefined表示使用当前用户
  unqualifiedReason?: string;
  unqualifiedAt?: Date;
  lostStage?: string;
  lostType?: string;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Opportunity) private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Visit) private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(MemberDepartment) private readonly memberDepartmentRepo: Repository<MemberDepartment>,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkDuplicateCompany(company: string, tenantId: number, excludeId?: number): Promise<boolean> {
    if (!company || !company.trim()) {
      return false; // 公司名称为空，不检查重复
    }
    const queryBuilder = this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.company = :company', { company: company.trim() })
      .andWhere('lead.deletedAt IS NULL');
    
    if (excludeId) {
      queryBuilder.andWhere('lead.id != :excludeId', { excludeId });
    }
    
    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async create(dto: CreateLeadDto, tenantId: number, memberId: number, departmentId?: number) {
    // 检查重复公司
    if (dto.company && dto.company.trim()) {
      const isDuplicate = await this.checkDuplicateCompany(dto.company.trim(), tenantId);
      if (isDuplicate) {
        throw new BadRequestException(`该公司"${dto.company.trim()}"已存在线索，不允许重复添加`);
      }
    }
    
    // 处理 ownerId：
    // 1. 如果 dto.ownerId 是 null，表示没有负责人（线索池）
    // 2. 如果 dto.ownerId 是数字或数字字符串，使用该值
    // 3. 如果 dto.ownerId 是 undefined 或空字符串，使用当前用户作为负责人
    let ownerId: number | null;
    if (dto.ownerId === null) {
      ownerId = null; // 明确设置为 null，表示没有负责人
    } else if (dto.ownerId !== undefined && dto.ownerId !== '') {
      // 转换为数字
      if (typeof dto.ownerId === 'string') {
        const parsed = parseInt(dto.ownerId, 10);
        ownerId = isNaN(parsed) ? memberId : parsed;
      } else {
        ownerId = dto.ownerId;
      }
    } else {
      // dto.ownerId 是 undefined 或空字符串，使用当前用户
      ownerId = memberId;
    }
    
    const lead = this.leadRepo.create({
      ...dto,
      tenantId,
      ownerId,
      departmentId,
      status: 'new',
      leadSource: dto.leadSource || 'other',
      createdBy: memberId,
    });
    return this.leadRepo.save(lead);
  }

  async update(id: number, dto: Partial<CreateLeadDto>, tenantId: number) {
    const lead = await this.leadRepo.findOne({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new ForbiddenException('已转化的线索不允许编辑');
    
    const oldStatus: LeadStatus = lead.status;
    
    // 处理 ownerId：如果 dto 中指定了 ownerId，需要正确转换
    let processedOwnerId: number | null | undefined = undefined;
    if (dto.ownerId !== undefined) {
      if (dto.ownerId === null) {
        processedOwnerId = null; // 明确设置为 null，表示没有负责人
      } else if (typeof dto.ownerId === 'string') {
        const trimmed = dto.ownerId.trim();
        if (trimmed === '' || trimmed === 'null') {
          processedOwnerId = null;
        } else {
          const parsed = parseInt(trimmed, 10);
          processedOwnerId = isNaN(parsed) ? undefined : parsed;
        }
      } else if (typeof dto.ownerId === 'number') {
        processedOwnerId = isNaN(dto.ownerId) ? undefined : dto.ownerId;
      }
    }
    
    // 构建更新数据，排除 ownerId，稍后单独处理
    const { ownerId, ...restDto } = dto;
    Object.assign(lead, restDto);
    
    // 如果 ownerId 被处理过，单独设置
    if (processedOwnerId !== undefined) {
      lead.ownerId = processedOwnerId;
    }
    
    // 当状态变更为 unqualified 时的业务逻辑
    if (dto.status === 'unqualified' && oldStatus !== 'unqualified') {
      // 自动设置不合格时间
      if (!lead.unqualifiedAt) {
        lead.unqualifiedAt = new Date();
      }
      // 如果未指定流失阶段，自动设置为变更前的状态
      // 由于前面已经检查过 lead.status !== 'converted'，所以 oldStatus 不可能是 'converted'
      if (!lead.lostStage && oldStatus) {
        lead.lostStage = oldStatus;
      }
    }
    
    return this.leadRepo.save(lead);
  }

  /**
   * 获取线索统计数据
   */
  async getStatistics(tenantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 总线索数
    const totalLeads = await this.leadRepo.count({
      where: { tenantId, deletedAt: null },
    });

    // 今日新增线索
    const todayNewLeads = await this.leadRepo
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.createdAt >= :today', { today })
      .andWhere('lead.createdAt < :tomorrow', { tomorrow })
      .getCount();

    // 待跟进线索（新建+已联系）
    const pendingLeads = await this.leadRepo.count({
      where: {
        tenantId,
        deletedAt: null,
        status: In(['new', 'contacted']),
      },
    });

    // 合格线索数
    const qualifiedLeads = await this.leadRepo.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'qualified',
      },
    });

    // 转化线索数
    const convertedLeads = await this.leadRepo.count({
      where: {
        tenantId,
        deletedAt: null,
        status: 'converted',
      },
    });

    // 转化率
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // 状态分布
    const statusDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .groupBy('lead.status')
      .getRawMany();

    const statusMap: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      unqualified: 0,
      converted: 0,
    };
    statusDistribution.forEach((item) => {
      statusMap[item.status] = parseInt(item.count, 10);
    });

    // 来源分布
    const sourceDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.leadSource', 'source')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN lead.status = :convertedStatus THEN 1 ELSE 0 END)', 'convertedCount')
      .where('lead.tenantId = :tenantId', { tenantId, convertedStatus: 'converted' })
      .andWhere('lead.deletedAt IS NULL')
      .groupBy('lead.leadSource')
      .getRawMany();

    const sourceData = sourceDistribution.map((item) => ({
      source: item.source || 'other',
      count: parseInt(item.count, 10),
      convertedCount: parseInt(item.convertedCount || '0', 10),
      conversionRate: parseInt(item.count, 10) > 0 
        ? (parseInt(item.convertedCount || '0', 10) / parseInt(item.count, 10)) * 100 
        : 0,
    }));

    // 评分分布
    const ratingDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .groupBy('lead.rating')
      .getRawMany();

    const ratingMap: Record<string, number> = {
      hot: 0,
      warm: 0,
      cold: 0,
    };
    ratingDistribution.forEach((item) => {
      ratingMap[item.rating] = parseInt(item.count, 10);
    });

    // 负责人/团队分析
    const ownerDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .leftJoin('lead.owner', 'owner')
      .leftJoin('owner.user', 'user')
      .select('lead.ownerId', 'ownerId')
      .addSelect('COALESCE(owner.nickname, user.username, CONCAT(\'负责人\', owner.id))', 'ownerName')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN lead.status = :convertedStatus THEN 1 ELSE 0 END)', 'convertedCount')
      .where('lead.tenantId = :tenantId', { tenantId, convertedStatus: 'converted' })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.ownerId IS NOT NULL')
      .groupBy('lead.ownerId')
      .addGroupBy('owner.nickname')
      .addGroupBy('user.username')
      .addGroupBy('owner.id')
      .orderBy('count', 'DESC')
      .limit(20) // 限制返回前20名负责人
      .getRawMany();

    const ownerData = ownerDistribution.map((item) => {
      // 处理负责人名称
      let ownerName = item.ownerName;
      if (!ownerName) {
        // 如果没有获取到名称，尝试从关联数据中获取
        ownerName = `负责人${item.ownerId}`;
      }
      return {
        ownerId: item.ownerId,
        ownerName,
        count: parseInt(item.count, 10),
        convertedCount: parseInt(item.convertedCount || '0', 10),
        conversionRate: parseInt(item.count, 10) > 0 
          ? (parseInt(item.convertedCount || '0', 10) / parseInt(item.count, 10)) * 100 
          : 0,
      };
    });

    // 行业分布
    const industryDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN lead.status = :convertedStatus THEN 1 ELSE 0 END)', 'convertedCount')
      .where('lead.tenantId = :tenantId', { tenantId, convertedStatus: 'converted' })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.industry IS NOT NULL')
      .andWhere('lead.industry != :empty', { empty: '' })
      .groupBy('lead.industry')
      .orderBy('count', 'DESC')
      .getRawMany();

    const industryData = industryDistribution.map((item) => ({
      industry: item.industry || '未分类',
      count: parseInt(item.count, 10),
      convertedCount: parseInt(item.convertedCount || '0', 10),
      conversionRate: parseInt(item.count, 10) > 0 
        ? (parseInt(item.convertedCount || '0', 10) / parseInt(item.count, 10)) * 100 
        : 0,
    }));

    // 地区分布（按省份）
    const regionDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('COALESCE(lead.province, \'未分类\')', 'province')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN lead.status = :convertedStatus THEN 1 ELSE 0 END)', 'convertedCount')
      .where('lead.tenantId = :tenantId', { tenantId, convertedStatus: 'converted' })
      .andWhere('lead.deletedAt IS NULL')
      .groupBy('lead.province')
      .orderBy('count', 'DESC')
      .limit(15) // 限制返回前15个省份
      .getRawMany();

    const regionData = regionDistribution.map((item) => ({
      province: item.province || '未分类',
      count: parseInt(item.count, 10),
      convertedCount: parseInt(item.convertedCount || '0', 10),
      conversionRate: parseInt(item.count, 10) > 0 
        ? (parseInt(item.convertedCount || '0', 10) / parseInt(item.count, 10)) * 100 
        : 0,
    }));

    // 城市分布（按省份+城市）
    const cityDistribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('COALESCE(lead.province, \'未分类\')', 'province')
      .addSelect('COALESCE(lead.city, \'未分类\')', 'city')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CASE WHEN lead.status = :convertedStatus THEN 1 ELSE 0 END)', 'convertedCount')
      .where('lead.tenantId = :tenantId', { tenantId, convertedStatus: 'converted' })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.province IS NOT NULL')
      .andWhere('lead.city IS NOT NULL')
      .andWhere('lead.province != :empty', { empty: '' })
      .andWhere('lead.city != :empty', { empty: '' })
      .groupBy('lead.province')
      .addGroupBy('lead.city')
      .orderBy('count', 'DESC')
      .getRawMany();

    const cityData = cityDistribution.map((item) => ({
      province: item.province || '未分类',
      city: item.city || '未分类',
      count: parseInt(item.count, 10),
      convertedCount: parseInt(item.convertedCount || '0', 10),
      conversionRate: parseInt(item.count, 10) > 0 
        ? (parseInt(item.convertedCount || '0', 10) / parseInt(item.count, 10)) * 100 
        : 0,
    }));

    return {
      overview: {
        totalLeads,
        todayNewLeads,
        pendingLeads,
        qualifiedLeads,
        convertedLeads,
        conversionRate: Number(conversionRate.toFixed(2)),
      },
      statusDistribution: [
        { status: 'new', count: statusMap.new, label: '新建' },
        { status: 'contacted', count: statusMap.contacted, label: '已联系' },
        { status: 'qualified', count: statusMap.qualified, label: '合格' },
        { status: 'unqualified', count: statusMap.unqualified, label: '不合格' },
        { status: 'converted', count: statusMap.converted, label: '已转化' },
      ],
      sourceDistribution: sourceData,
      ratingDistribution: [
        { rating: 'hot', count: ratingMap.hot, label: '热' },
        { rating: 'warm', count: ratingMap.warm, label: '温' },
        { rating: 'cold', count: ratingMap.cold, label: '冷' },
      ],
      ownerDistribution: ownerData,
      industryDistribution: industryData,
      regionDistribution: regionData,
      cityDistribution: cityData,
      // 流失分析统计
      churnAnalysis: {
        // 流失原因分布
        reasonDistribution: await this.getChurnReasonDistribution(tenantId),
        // 流失阶段分布
        stageDistribution: await this.getChurnStageDistribution(tenantId),
        // 流失类型分布
        typeDistribution: await this.getChurnTypeDistribution(tenantId),
        // 流失趋势（按天统计最近30天）
        trend: await this.getChurnTrend(tenantId),
      },
    };
  }

  // 流失原因分布统计
  private async getChurnReasonDistribution(tenantId: number) {
    const distribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.unqualifiedReason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.status = :status', { status: 'unqualified' })
      .andWhere('lead.unqualifiedReason IS NOT NULL')
      .groupBy('lead.unqualifiedReason')
      .orderBy('count', 'DESC')
      .getRawMany();

    return distribution.map((item) => ({
      reason: item.reason || 'other',
      count: parseInt(item.count, 10),
    }));
  }

  // 流失阶段分布统计
  private async getChurnStageDistribution(tenantId: number) {
    const distribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.lostStage', 'stage')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.status = :status', { status: 'unqualified' })
      .andWhere('lead.lostStage IS NOT NULL')
      .groupBy('lead.lostStage')
      .orderBy('count', 'DESC')
      .getRawMany();

    const stageMap: Record<string, string> = {
      new: '新建阶段',
      contacted: '已联系阶段',
      qualified: '合格阶段',
    };

    return distribution.map((item) => ({
      stage: item.stage || 'unknown',
      stageLabel: stageMap[item.stage] || item.stage || '未知',
      count: parseInt(item.count, 10),
    }));
  }

  // 流失类型分布统计
  private async getChurnTypeDistribution(tenantId: number) {
    const distribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('lead.lostType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.status = :status', { status: 'unqualified' })
      .andWhere('lead.lostType IS NOT NULL')
      .groupBy('lead.lostType')
      .orderBy('count', 'DESC')
      .getRawMany();

    return distribution.map((item) => ({
      type: item.type || 'unknown',
      count: parseInt(item.count, 10),
    }));
  }

  // 流失趋势统计（最近30天）
  private async getChurnTrend(tenantId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const distribution = await this.leadRepo
      .createQueryBuilder('lead')
      .select('DATE(lead.unqualifiedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL')
      .andWhere('lead.status = :status', { status: 'unqualified' })
      .andWhere('lead.unqualifiedAt >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('DATE(lead.unqualifiedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return distribution.map((item) => ({
      date: item.date,
      count: parseInt(item.count, 10),
    }));
  }

  /**
   * 获取当前用户及其下级用户的成员ID列表
   * 权限规则：
   * 1. 当前用户自己（总是包含）
   * 2. 如果当前用户是部门负责人，可以看到该部门所有成员的线索
   * 3. 如果当前用户管理的部门有下级部门，可以看到下级部门所有成员的线索（递归）
   * 4. 普通成员只能看到自己的线索
   */
  private async getSubordinateMemberIds(memberId: number, tenantId: number): Promise<number[]> {
    const subordinateMemberIds: number[] = [memberId]; // 总是包含当前用户自己
    
    // 1. 获取当前用户作为负责人的部门（如果当前用户是部门负责人）
    const managedDepartments = await this.departmentRepo.find({
      where: { managerId: memberId, tenantId },
    });
    
    if (managedDepartments.length === 0) {
      // 如果用户不是任何部门的负责人，只能看到自己的数据
      return subordinateMemberIds;
    }
    
    // 2. 收集所有相关部门ID（当前用户负责的部门）
    const allDepartmentIds = new Set<number>();
    managedDepartments.forEach(dept => allDepartmentIds.add(dept.id));
    
    // 3. 递归获取所有下级部门ID（包括子部门、孙部门等）
    const getAllSubDepartmentIds = async (parentIds: number[]): Promise<number[]> => {
      if (parentIds.length === 0) return [];
      
      const subDepartments = await this.departmentRepo.find({
        where: { parentId: In(parentIds), tenantId },
      });
      
      if (subDepartments.length === 0) return [];
      
      const subDepartmentIds = subDepartments.map(d => d.id);
      const deeperSubIds = await getAllSubDepartmentIds(subDepartmentIds);
      
      return [...subDepartmentIds, ...deeperSubIds];
    };
    
    const departmentIdsArray = Array.from(allDepartmentIds);
    const subDepartmentIds = await getAllSubDepartmentIds(departmentIdsArray);
    departmentIdsArray.forEach(id => allDepartmentIds.add(id));
    subDepartmentIds.forEach(id => allDepartmentIds.add(id));
    
    // 4. 获取所有这些部门下的所有成员ID
    if (allDepartmentIds.size > 0) {
      const subordinateMembers = await this.memberDepartmentRepo.find({
        where: { departmentId: In(Array.from(allDepartmentIds)) },
      });
      subordinateMembers.forEach(sm => {
        if (!subordinateMemberIds.includes(sm.memberId)) {
          subordinateMemberIds.push(sm.memberId);
        }
      });
    }
    
    return subordinateMemberIds;
  }

  async findAll(
    tenantId: number,
    page = 1,
    limit = 50,
    search?: string,
    status?: string,
    rating?: string,
    source?: string,
    ownerId?: number | null,
    currentMemberId?: number, // 当前用户ID，用于过滤线索管理页面
    includeSubordinates = false, // 是否包含下级用户的线索
  ) {
    this.logger.log(`[findAll] 开始查询，参数: tenantId=${tenantId}, page=${page}, limit=${limit}, search=${search}, status=${status}, rating=${rating}, source=${source}, ownerId=${ownerId}`);
    
    const queryBuilder = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .leftJoinAndSelect('lead.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'creatorUser')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.deletedAt IS NULL') // 排除已删除的记录
      .orderBy('lead.createdAt', 'DESC');

    // 搜索条件
    if (search && typeof search === 'string' && search.trim()) {
      const keyword = `%${search.trim().toLowerCase()}%`;
      this.logger.debug(`[findAll] 应用搜索条件: ${keyword}`);
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(COALESCE(lead.name, \'\')) LIKE :keyword', { keyword })
            .orWhere('LOWER(COALESCE(lead.company, \'\')) LIKE :keyword', { keyword })
            .orWhere('LOWER(COALESCE(lead.title, \'\')) LIKE :keyword', { keyword })
            .orWhere('LOWER(COALESCE(lead.phone, \'\')) LIKE :keyword', { keyword })
            .orWhere('LOWER(COALESCE(lead.email, \'\')) LIKE :keyword', { keyword });
        }),
      );
    }

    // 状态过滤（支持多个状态，用逗号分隔）
    if (status && typeof status === 'string' && status.trim()) {
      const validStatuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s);
      const validStatusArray = statusArray.filter(s => validStatuses.includes(s as LeadStatus));
      
      if (validStatusArray.length > 0) {
        this.logger.log(`[findAll] 应用状态过滤: ${validStatusArray.join(', ')}`);
        queryBuilder.andWhere('lead.status IN (:...statuses)', { statuses: validStatusArray });
      } else {
        this.logger.warn(`[findAll] 无效的状态值: ${status}`);
      }
    }

    // 评分过滤
    if (rating && typeof rating === 'string' && rating.trim()) {
      const validRatings: ('hot' | 'warm' | 'cold')[] = ['hot', 'warm', 'cold'];
      const trimmedRating = rating.trim();
      if (validRatings.includes(trimmedRating as 'hot' | 'warm' | 'cold')) {
        this.logger.log(`[findAll] 应用评分过滤: ${trimmedRating}`);
        queryBuilder.andWhere('lead.rating = :rating', { rating: trimmedRating });
      } else {
        this.logger.warn(`[findAll] 无效的评分值: ${trimmedRating}`);
      }
    }

    // 来源过滤
    if (source && typeof source === 'string' && source.trim()) {
      const trimmedSource = source.trim();
      this.logger.log(`[findAll] 应用来源过滤: ${trimmedSource}`);
      queryBuilder.andWhere('lead.leadSource = :source', { source: trimmedSource });
    }

    // 负责人过滤
    if (ownerId !== undefined) {
      if (ownerId === null) {
        // 线索池：只显示没有负责人的线索
        this.logger.log(`[findAll] 应用负责人过滤: ownerId IS NULL (线索池)`);
        queryBuilder.andWhere('lead.ownerId IS NULL');
      } else if (typeof ownerId === 'number') {
        // 指定负责人的线索
        this.logger.log(`[findAll] 应用负责人过滤: ownerId = ${ownerId}`);
        queryBuilder.andWhere('lead.ownerId = :ownerId', { ownerId });
      }
    } else if (currentMemberId !== undefined && currentMemberId !== null) {
      // 线索管理：只显示当前用户及其下级用户的线索
      if (includeSubordinates) {
        // 获取当前用户及其下级用户的成员ID列表
        const subordinateMemberIds = await this.getSubordinateMemberIds(currentMemberId, tenantId);
        this.logger.log(`[findAll] 应用当前用户过滤（包含下级）: memberId = ${currentMemberId}, 下级用户数 = ${subordinateMemberIds.length - 1}`);
        if (subordinateMemberIds.length === 1) {
          // 只有当前用户自己
          queryBuilder.andWhere('lead.ownerId = :currentMemberId', { currentMemberId });
        } else {
          // 包含下级用户
          queryBuilder.andWhere('lead.ownerId IN (:...subordinateMemberIds)', { subordinateMemberIds });
        }
      } else {
        // 只显示当前用户的线索
        this.logger.log(`[findAll] 应用当前用户过滤: memberId = ${currentMemberId}`);
        queryBuilder.andWhere('lead.ownerId = :currentMemberId', { currentMemberId });
      }
    }

    // 克隆查询构建器用于获取总数
    const countQueryBuilder = queryBuilder.clone();
    const total = await countQueryBuilder.getCount();
    this.logger.log(`[findAll] 查询总数: ${total}`);

    // 应用分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    // 获取SQL查询语句（用于调试）
    const sql = queryBuilder.getSql();
    const params = queryBuilder.getParameters();
    this.logger.debug(`[findAll] SQL: ${sql}`);
    this.logger.debug(`[findAll] 参数: ${JSON.stringify(params)}`);

    const items = await queryBuilder.getMany();
    this.logger.log(`[findAll] 查询结果数量: ${items.length}`);

    // 批量查询部门信息
    const departmentIds = [...new Set(items.map(l => l.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.dataSource.getRepository(Department).find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
      this.logger.debug(`[findAll] 查询到 ${departments.length} 个部门，departmentIds: ${departmentIds.join(', ')}`);
    }

    // 序列化 owner 字段
    const serialized = items.map((lead) => {
      const leadDepartmentId = lead.departmentId ? Number(lead.departmentId) : null;
      return {
        ...lead,
        department: leadDepartmentId && departmentsMap.has(leadDepartmentId)
          ? { id: departmentsMap.get(leadDepartmentId)!.id, name: departmentsMap.get(leadDepartmentId)!.name }
          : null,
        owner: lead.owner
          ? {
              id: lead.owner.id,
              username: lead.owner.nickname || (lead as any).owner?.user?.username || null,
            }
          : null,
      };
    });

    return { leads: serialized, total, page, limit };
  }

  async convert(
    leadId: number,
    tenantId: number,
    operatorMemberId: number,
    options?: {
      convertToCustomer?: boolean;
      convertToOpportunity?: boolean;
      opportunityName?: string;
      amount?: number;
      stage?: string;
      status?: string;
      probability?: number;
      expectedCloseDate?: string;
      assignToMemberId?: number;
      departmentId?: number;
      planNextActivity?: boolean;
      activityTitle?: string;
      activityType?: string;
      activityStartTime?: string;
      activityEndTime?: string;
      activityDescription?: string;
      activityLocation?: string;
      planNextVisit?: boolean;
      visitDescription?: string;
      visitType?: string;
      visitStartTime?: string;
      visitEndTime?: string;
      visitPurpose?: string;
      visitRegion?: string[];
      visitAddress?: string;
    },
  ) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new ForbiddenException('线索已转化');

    // 使用传入的 departmentId，如果没有则使用线索的 departmentId
    const departmentId = options?.departmentId ?? lead.departmentId;

    // 默认值：始终转化为客户，只有明确指定时才转化为商机
    const convertToCustomer = options?.convertToCustomer !== undefined ? options.convertToCustomer : true;
    const convertToOpportunity = options?.convertToOpportunity || false;

    // 如果勾选了转化为商机，验证必填字段
    if (convertToOpportunity) {
      if (!options?.opportunityName || !options.opportunityName.trim()) {
        throw new BadRequestException('转化为商机时，商机标题为必填项');
      }
      if (!options?.amount && options?.amount !== 0) {
        throw new BadRequestException('转化为商机时，预计价值为必填项');
      }
      if (!options?.stage) {
        throw new BadRequestException('转化为商机时，商机阶段为必填项');
      }
      if (!options?.status) {
        throw new BadRequestException('转化为商机时，商机状态为必填项');
      }
      if (options?.probability === undefined || options?.probability === null) {
        throw new BadRequestException('转化为商机时，成交概率为必填项');
      }
      // 预计成交日期改为非必填
      // if (!options?.expectedCloseDate) {
      //   throw new BadRequestException('转化为商机时，预计成交日期为必填项');
      // }
    }

    return await this.dataSource.transaction(async (manager) => {
      let customer: Customer | null = null;
      let contact: Contact | null = null;
      let opportunity: Opportunity | null = null;

      // 创建客户（始终创建，因为 convertToCustomer 默认 true）
      if (convertToCustomer) {
        const trimmedCompany = lead.company?.trim();
        customer = manager.create(Customer, {
          name: trimmedCompany ? trimmedCompany : (lead.name?.trim() || '新客户'),
          type: lead.company?.trim() ? CustomerType.COMPANY : CustomerType.INDIVIDUAL,
          ownerId: options?.assignToMemberId || operatorMemberId,
          tenantId,
          departmentId,
          source: lead.leadSource,
          industry: lead.industry,
          level: lead.level,
          province: lead.province,
          city: lead.city,
          district: lead.district,
          addressDetail: lead.addressDetail,
          companyName: trimmedCompany || undefined,
          estimatedValue: options?.amount ?? undefined,
          createdBy: operatorMemberId,
        });
        await manager.save(Customer, customer);

        // 创建联系人
        contact = manager.create(Contact, {
          name: lead.name?.trim() || '联系人',
          position: lead.title,
          phone: lead.phone,
          email: lead.email,
          type: ContactType.PRIMARY,
          isPrimary: true,
          customerId: customer.id,
          tenantId,
          departmentId,
          createdBy: operatorMemberId,
        });
        await manager.save(Contact, contact);
      }

      // 创建商机（只有勾选了转化为商机时才创建）
      if (convertToOpportunity && customer) {
        // 验证商机阶段和状态枚举值
        const validStages = Object.values(OpportunityStage);
        const validStatuses = Object.values(OpportunityStatus);
        
        if (!validStages.includes(options?.stage as OpportunityStage)) {
          throw new BadRequestException(`无效的商机阶段: ${options?.stage}`);
        }
        if (!validStatuses.includes(options?.status as OpportunityStatus)) {
          throw new BadRequestException(`无效的商机状态: ${options?.status}`);
        }

        opportunity = manager.create(Opportunity, {
          name: options?.opportunityName?.trim() || `${customer.name} - 首次商机`,
          description: '由线索自动转化创建',
          amount: options?.amount ?? 0,
          probability: options?.probability ?? 0,
          expectedCloseDate: options?.expectedCloseDate ? new Date(options.expectedCloseDate) : null,
          stage: options?.stage as OpportunityStage,
          status: options?.status as OpportunityStatus,
          customerId: customer.id,
          ownerId: options?.assignToMemberId || operatorMemberId,
          tenantId,
          departmentId,
          createdBy: operatorMemberId,
        });
        await manager.save(Opportunity, opportunity);
      }

      // 创建下一步计划活动（如果用户勾选了）
      let activity: Activity | null = null;
      if (options?.planNextActivity && customer) {
        // 验证必填字段
        if (!options?.activityTitle || !options.activityTitle.trim()) {
          throw new BadRequestException('创建下一步计划活动时，活动标题为必填项');
        }
        if (!options?.activityType) {
          throw new BadRequestException('创建下一步计划活动时，活动类型为必填项');
        }
        if (!options?.activityStartTime) {
          throw new BadRequestException('创建下一步计划活动时，计划开始时间为必填项');
        }
        if (!options?.activityEndTime) {
          throw new BadRequestException('创建下一步计划活动时，计划结束时间为必填项');
        }
        
        // 验证活动类型枚举值
        const validActivityTypes = Object.values(ActivityType);
        if (!validActivityTypes.includes(options.activityType as ActivityType)) {
          throw new BadRequestException(`无效的活动类型: ${options.activityType}`);
        }
        
        activity = manager.create(Activity, {
          title: options.activityTitle.trim(),
          description: options?.activityDescription?.trim() || undefined,
          type: options.activityType as ActivityType,
          status: ActivityStatus.PLANNED,
          plannedStartTime: new Date(options.activityStartTime),
          plannedEndTime: new Date(options.activityEndTime),
          location: options?.activityLocation?.trim() || undefined,
          relatedToType: RelatedToType.CUSTOMER,
          relatedToId: customer.id,
          ownerId: options?.assignToMemberId || operatorMemberId,
          tenantId,
          departmentId,
          createdBy: operatorMemberId,
        });
        await manager.save(Activity, activity);
      }
      
      // 创建下一步计划拜访（如果用户勾选了）
      let visit: Visit | null = null;
      if (options?.planNextVisit && customer) {
        // 验证必填字段
        if (!options?.visitDescription || !options.visitDescription.trim()) {
          throw new BadRequestException('创建下一步计划拜访时，拜访描述为必填项');
        }
        if (!options?.visitType) {
          throw new BadRequestException('创建下一步计划拜访时，拜访类型为必填项');
        }
        if (!options?.visitStartTime) {
          throw new BadRequestException('创建下一步计划拜访时，计划开始时间为必填项');
        }
        if (!options?.visitEndTime) {
          throw new BadRequestException('创建下一步计划拜访时，计划结束时间为必填项');
        }
        
        // 验证拜访类型枚举值
        const validVisitTypes = Object.values(VisitType);
        if (!validVisitTypes.includes(options.visitType as VisitType)) {
          throw new BadRequestException(`无效的拜访类型: ${options.visitType}`);
        }
        
        // 处理拜访地址（优先使用用户选择的地区，否则使用客户信息）
        let region: string[] = [];
        if (options?.visitRegion && options.visitRegion.length > 0) {
          region = options.visitRegion;
        } else {
          if (customer.province) region.push(customer.province);
          if (customer.city) region.push(customer.city);
          if (customer.district) region.push(customer.district);
        }
        
        visit = manager.create(Visit, {
          description: options.visitDescription.trim(),
          type: options.visitType as VisitType,
          status: VisitStatus.PLANNED,
          plannedStartTime: new Date(options.visitStartTime),
          plannedEndTime: new Date(options.visitEndTime),
          purpose: options?.visitPurpose ? (options.visitPurpose as VisitPurpose) : undefined,
          detailAddress: options?.visitAddress?.trim() || customer.addressDetail || undefined,
          region: region.length > 0 ? region : undefined,
          customerId: customer.id,
          contactId: contact?.id || undefined,
          opportunityId: opportunity?.id || undefined,
          ownerId: options?.assignToMemberId || operatorMemberId,
          tenantId,
          departmentId,
          createdBy: operatorMemberId,
        });
        await manager.save(Visit, visit);
      }

      // 更新线索
      lead.status = 'converted' as LeadStatus;
      lead.convertedAt = new Date();
      lead.convertedCustomerId = customer?.id ?? null;
      lead.convertedContactId = contact?.id ?? null;
      lead.convertedOpportunityId = opportunity?.id ?? null;
      await manager.save(Lead, lead);

      return { lead, customer, contact, opportunity, activity };
    });
  }

  /**
   * 转移线索（单个或批量）
   * @param leadIds 线索ID数组
   * @param newOwnerId 新负责人ID
   * @param tenantId 租户ID
   * @param operatorMemberId 操作人ID
   */
  /**
   * 放入线索池（批量设置 ownerId 为 null）
   */
  async moveToPool(leadIds: number[], tenantId: number, operatorMemberId: number) {
    this.logger.log(`[moveToPool] 开始放入线索池，leadIds: ${leadIds.join(', ')}, tenantId: ${tenantId}`);
    
    // 在更新前查询线索，获取原负责人信息
    const leads = await this.leadRepo.find({
      where: leadIds.map(id => ({ id, tenantId })),
      relations: ['owner', 'owner.user'],
    });

    if (leads.length === 0) {
      throw new NotFoundException('线索不存在或不属于当前租户');
    }

    // 获取操作人信息
    const operator = await this.memberRepo.findOne({
      where: { id: operatorMemberId, tenantId },
      relations: ['user'],
    });
    const operatorName = operator?.nickname || operator?.user?.username || '未知用户';

    // 批量更新线索的负责人为 null
    const result = await this.leadRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ ownerId: null })
      .where('id IN (:...leadIds)', { leadIds })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('deletedAt IS NULL')
      .execute();
    
    this.logger.log(`[moveToPool] 放入线索池成功，影响行数: ${result.affected}`);

    // 发送通知给原负责人（如果有）
    try {
      // 按原负责人分组线索
      const leadsByOldOwner = new Map<number, Lead[]>();
      const oldOwnerInfo = new Map<number, { name: string; userId: number }>();

      for (const lead of leads) {
        if (lead.ownerId) {
          // 原负责人存在
          const oldOwnerUserId = await NotificationHelper.getUserIdFromMemberId(this.memberRepo, lead.ownerId);
          if (oldOwnerUserId) {
            if (!leadsByOldOwner.has(oldOwnerUserId)) {
              leadsByOldOwner.set(oldOwnerUserId, []);
              // 获取原负责人名称
              const oldOwnerName = lead.owner?.nickname || lead.owner?.user?.username || '未知用户';
              oldOwnerInfo.set(oldOwnerUserId, { name: oldOwnerName, userId: oldOwnerUserId });
            }
            leadsByOldOwner.get(oldOwnerUserId)!.push(lead);
          }
        }
      }

      // 通知原负责人
      for (const [oldOwnerUserId, ownerLeads] of leadsByOldOwner.entries()) {
        // 格式化线索名称
        let leadNameText: string;
        if (ownerLeads.length === 1) {
          // 单个线索：显示线索名称
          const lead = ownerLeads[0];
          leadNameText = lead.name || lead.company || `线索${lead.id}`;
        } else {
          // 多个线索：显示第一个线索名称 + 等X条线索
          const firstLead = ownerLeads[0];
          const firstName = firstLead.name || firstLead.company || `线索${firstLead.id}`;
          leadNameText = `${firstName}等${ownerLeads.length}条线索`;
        }

        await this.notificationsService.create(
          {
            receiverId: oldOwnerUserId,
            type: NotificationType.SYSTEM,
            title: '线索被收回',
            content: `${operatorName}将线索"${leadNameText}"收回到线索池`,
            metadata: {
              businessType: 'lead',
              businessId: ownerLeads[0]?.id,
              subType: 'lead_reclaimed',
              priority: 'medium',
              actorId: operatorMemberId,
              actorName: operatorName,
              link: `/leads/pool`,
            },
          },
          tenantId,
        );
      }
    } catch (error) {
      // 通知发送失败不影响放入线索池操作
      this.logger.error('发送线索收回通知失败:', error);
    }

    return { affected: result.affected || 0, leadIds };
  }

  /**
   * 领取线索（批量设置 ownerId 为当前用户）
   */
  async claim(leadIds: number[], tenantId: number, operatorMemberId: number) {
    this.logger.log(`[claim] 开始领取线索，leadIds: ${leadIds.join(', ')}, tenantId: ${tenantId}, operatorMemberId: ${operatorMemberId}`);
    
    const result = await this.leadRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ ownerId: operatorMemberId })
      .where('id IN (:...leadIds)', { leadIds })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('deletedAt IS NULL')
      .andWhere('ownerId IS NULL') // 只能领取没有负责人的线索
      .execute();
    
    this.logger.log(`[claim] 领取线索成功，影响行数: ${result.affected}`);
    return { affected: result.affected || 0, leadIds };
  }

  /**
   * 分配线索（从线索池分配给用户，只有部门负责人可以操作）
   */
  async assign(leadIds: number[], newOwnerId: number, tenantId: number, operatorMemberId: number) {
    // 验证新负责人是否存在且属于同一租户
    const newOwner = await this.memberRepo.findOne({
      where: { id: newOwnerId, tenantId },
      relations: ['user'],
    });
    if (!newOwner) {
      throw new NotFoundException('新负责人不存在或不属于当前租户');
    }

    // 验证操作人是否是部门负责人
    const operator = await this.memberRepo.findOne({
      where: { id: operatorMemberId, tenantId },
      relations: ['user'],
    });
    if (!operator) {
      throw new NotFoundException('操作人不存在');
    }

    // 检查操作人是否是部门负责人
    const operatorDepartments = await this.memberDepartmentRepo.find({
      where: { memberId: operatorMemberId },
      relations: ['department'],
    });

    let isDepartmentManager = false;
    for (const memberDept of operatorDepartments) {
      if (memberDept.department && memberDept.department.managerId === operatorMemberId) {
        isDepartmentManager = true;
        break;
      }
    }

    if (!isDepartmentManager) {
      throw new ForbiddenException('只有部门负责人才能分配线索');
    }

    // 验证线索是否都在线索池中（没有负责人）
    const leads = await this.leadRepo.find({
      where: leadIds.map(id => ({ id, tenantId })),
    });

    if (leads.length === 0) {
      throw new NotFoundException('线索不存在或不属于当前租户');
    }

    // 检查是否有线索已经有负责人
    const leadsWithOwner = leads.filter(l => l.ownerId !== null);
    if (leadsWithOwner.length > 0) {
      throw new BadRequestException('只能分配线索池中的线索（没有负责人的线索）');
    }

    // 获取操作人信息（优先使用 nickname，其次使用 user.username，最后使用 user.realName）
    const operatorName = operator.nickname || operator.user?.username || '未知用户';

    // 获取新负责人名称
    const newOwnerName = newOwner.nickname || newOwner.user?.username || '未知用户';

    // 批量更新线索的负责人
    const result = await this.leadRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ ownerId: newOwnerId })
      .where('id IN (:...leadIds)', { leadIds })
      .andWhere('tenantId = :tenantId', { tenantId })
      .andWhere('ownerId IS NULL') // 确保只分配线索池中的线索
      .execute();

    // 发送通知
    try {
      const newOwnerUserId = await NotificationHelper.getUserIdFromMemberId(this.memberRepo, newOwnerId);
      const operatorUserId = operator ? await NotificationHelper.getUserIdFromMemberId(this.memberRepo, operatorMemberId) : null;

      // 通知新负责人（如果存在且不是操作人）
      if (newOwnerUserId && newOwnerUserId !== operatorUserId) {
        // 格式化线索名称：{操作人}将线索"{线索名称}"分配给您
        let leadNameText: string;
        if (leads.length === 1) {
          // 单个线索：显示线索名称（优先显示 name，其次 company）
          const lead = leads[0];
          leadNameText = lead.name || lead.company || `线索${lead.id}`;
        } else {
          // 多个线索：显示第一个线索名称 + 等X条线索
          const firstLead = leads[0];
          const firstName = firstLead.name || firstLead.company || `线索${firstLead.id}`;
          leadNameText = `${firstName}等${leads.length}条线索`;
        }

        await this.notificationsService.create(
          {
            receiverId: newOwnerUserId,
            type: NotificationType.SYSTEM,
            title: '线索已分配',
            content: `${operatorName}将线索"${leadNameText}"分配给您`,
            metadata: {
              businessType: 'lead',
              businessId: leads[0]?.id,
              subType: 'lead_assigned',
              priority: 'high',
              actorId: operatorMemberId,
              actorName: operatorName,
              link: `/leads`,
            },
          },
          tenantId,
        );
      }
    } catch (error) {
      // 通知发送失败不影响分配操作
      this.logger.error('发送线索分配通知失败:', error);
    }

    return { affected: result.affected || 0, leadIds };
  }

  async transfer(leadIds: number[], newOwnerId: number, tenantId: number, operatorMemberId: number) {
    // 验证新负责人是否存在且属于同一租户
    const newOwner = await this.memberRepo.findOne({
      where: { id: newOwnerId, tenantId },
      relations: ['user'],
    });
    if (!newOwner) {
      throw new NotFoundException('新负责人不存在或不属于当前租户');
    }

    // 在转移前查询线索信息，获取原负责人
    const leads = await this.leadRepo.find({
      where: leadIds.map(id => ({ id, tenantId })),
      relations: ['owner', 'owner.user'],
    });

    if (leads.length === 0) {
      throw new NotFoundException('线索不存在或不属于当前租户');
    }

    // 获取操作人信息
    const operator = await this.memberRepo.findOne({
      where: { id: operatorMemberId, tenantId },
      relations: ['user'],
    });
    const operatorName = operator?.nickname || operator?.user?.username || '系统';

    // 获取新负责人名称
    const newOwnerName = newOwner.nickname || newOwner.user?.username || '未知用户';

    // 批量更新线索的负责人
    const result = await this.leadRepo
      .createQueryBuilder()
      .update(Lead)
      .set({ ownerId: newOwnerId })
      .where('id IN (:...leadIds)', { leadIds })
      .andWhere('tenantId = :tenantId', { tenantId })
      .execute();

    // 发送通知
    try {
      // 获取新负责人的 userId
      const newOwnerUserId = await NotificationHelper.getUserIdFromMemberId(this.memberRepo, newOwnerId);
      const operatorUserId = operator ? await NotificationHelper.getUserIdFromMemberId(this.memberRepo, operatorMemberId) : null;

      // 按原负责人分组线索
      const leadsByOldOwner = new Map<number, Lead[]>();
      const oldOwnerInfo = new Map<number, { name: string; userId: number }>();

      for (const lead of leads) {
        if (lead.ownerId && lead.ownerId !== newOwnerId) {
          // 原负责人存在且不是新负责人
          const oldOwnerUserId = await NotificationHelper.getUserIdFromMemberId(this.memberRepo, lead.ownerId);
          if (oldOwnerUserId) {
            if (!leadsByOldOwner.has(oldOwnerUserId)) {
              leadsByOldOwner.set(oldOwnerUserId, []);
              // 获取原负责人名称
              const oldOwnerName = lead.owner?.nickname || lead.owner?.user?.username || '未知用户';
              oldOwnerInfo.set(oldOwnerUserId, { name: oldOwnerName, userId: oldOwnerUserId });
            }
            leadsByOldOwner.get(oldOwnerUserId)!.push(lead);
          }
        }
      }

      // 通知原负责人（如果有）
      for (const [oldOwnerUserId, ownerLeads] of leadsByOldOwner.entries()) {
        const ownerInfo = oldOwnerInfo.get(oldOwnerUserId)!;
        const leadNames = ownerLeads
          .map(l => l.name || l.company || `线索${l.id}`)
          .slice(0, 3);
        const leadNameText = leadNames.length > 0 
          ? (leadNames.length === 1 ? leadNames[0] : `${leadNames[0]}等${ownerLeads.length}条线索`)
          : `${ownerLeads.length}条线索`;

        await this.notificationsService.create(
          {
            receiverId: oldOwnerUserId,
            type: NotificationType.SYSTEM,
            title: '线索已转移',
            content: `线索"${leadNameText}"已从${ownerInfo.name}转移给${newOwnerName}`,
            metadata: {
              businessType: 'lead',
              businessId: ownerLeads[0]?.id,
              subType: 'lead_transferred',
              priority: 'medium',
              actorId: operatorMemberId,
              actorName: operatorName,
              link: `/leads`,
            },
          },
          tenantId,
        );
      }

      // 通知新负责人（如果存在且不是操作人）
      if (newOwnerUserId && newOwnerUserId !== operatorUserId) {
        const leadNames = leads
          .map(l => l.name || l.company || `线索${l.id}`)
          .slice(0, 3);
        const leadNameText = leadNames.length > 0 
          ? (leadNames.length === 1 ? leadNames[0] : `${leadNames[0]}等${leads.length}条线索`)
          : `${leads.length}条线索`;

        await this.notificationsService.create(
          {
            receiverId: newOwnerUserId,
            type: NotificationType.SYSTEM,
            title: '线索已分配',
            content: `${operatorName}将线索"${leadNameText}"分配给您`,
            metadata: {
              businessType: 'lead',
              businessId: leads[0]?.id,
              subType: 'lead_assigned',
              priority: 'high',
              actorId: operatorMemberId,
              actorName: operatorName,
              link: `/leads`,
            },
          },
          tenantId,
        );
      }
    } catch (error) {
      // 通知发送失败不影响转移操作
      this.logger.error('发送线索转移通知失败:', error);
    }

    return { affected: result.affected || 0, leadIds };
  }

  /**
   * 删除线索（单个或批量）
   * @param leadIds 线索ID数组
   * @param tenantId 租户ID
   * @param operatorMemberId 操作人ID
   */
  async delete(leadIds: number[], tenantId: number, operatorMemberId: number) {
    // 验证线索是否存在且属于当前租户
    const leads = await this.leadRepo.find({
      where: leadIds.map(id => ({ id, tenantId })),
    });

    if (leads.length !== leadIds.length) {
      throw new NotFoundException('部分线索不存在或不属于当前租户');
    }

    // 批量删除线索（软删除）
    const result = await this.leadRepo.softDelete(leadIds);

    return { affected: result.affected || 0, leadIds };
  }
}


