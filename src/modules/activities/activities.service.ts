import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Activity, ActivityType, ActivityStatus, RelatedToType, ActivityPriority } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Contact } from '../../entities/contact.entity';
import { Lead } from '../../entities/lead.entity';
import { Department } from '../../entities/department.entity';

export interface CreateActivityDto {
  title: string;
  description?: string;
  type: ActivityType;
  status?: ActivityStatus;
  plannedStartTime?: Date;
  plannedEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  location?: string;
  outcome?: string;
  attachments?: string[];
  participants?: string[];
  relatedToType: RelatedToType;
  relatedToId?: number;
  priority?: ActivityPriority;
  content?: string;
  assignedBy?: number;
  ownerId?: number; // 指定负责人，若不传则默认当前用户
}

export interface UpdateActivityDto {
  title?: string;
  description?: string;
  type?: ActivityType;
  status?: ActivityStatus;
  plannedStartTime?: Date;
  plannedEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  location?: string;
  outcome?: string;
  attachments?: string[];
  participants?: string[];
  relatedToType?: RelatedToType;
  relatedToId?: number;
  priority?: ActivityPriority;
  content?: string;
  assignedBy?: number;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly dataSource: DataSource,
  ) {}

  async createActivity(createActivityDto: CreateActivityDto, memberId: number, tenantId: number, departmentId?: number) {
    // 构建活动对象，只包含有值的字段
    const activityData: any = {
      title: createActivityDto.title,
      description: createActivityDto.description,
      type: createActivityDto.type,
      status: createActivityDto.status,
      location: createActivityDto.location,
      outcome: createActivityDto.outcome,
      attachments: createActivityDto.attachments,
      participants: createActivityDto.participants,
      relatedToType: createActivityDto.relatedToType,
      relatedToId: createActivityDto.relatedToId,
      priority: createActivityDto.priority,
      content: createActivityDto.content,
      assignedBy: createActivityDto.assignedBy,
      ownerId: createActivityDto.ownerId || memberId,
      tenantId,
      departmentId,
      createdBy: memberId,
    };

    // 只有当值存在时才添加时间字段
    if (createActivityDto.plannedStartTime !== undefined) {
      activityData.plannedStartTime = createActivityDto.plannedStartTime;
    }
    if (createActivityDto.plannedEndTime !== undefined) {
      activityData.plannedEndTime = createActivityDto.plannedEndTime;
    }
    if (createActivityDto.actualStartTime !== undefined) {
      activityData.actualStartTime = createActivityDto.actualStartTime;
    }
    if (createActivityDto.actualEndTime !== undefined) {
      activityData.actualEndTime = createActivityDto.actualEndTime;
    }

    const activity = this.activityRepository.create(activityData);

    return await this.activityRepository.save(activity);
  }

  async findAllActivities(tenantId: number, page = 1, limit = 50, filters?: any) {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('activity.tenantId = :tenantId', { tenantId });
    
    if (filters?.ownerId) {
      queryBuilder.andWhere('activity.ownerId = :ownerId', { ownerId: filters.ownerId });
    }

    // 应用筛选条件
    if (filters?.title) {
      queryBuilder.andWhere('activity.title LIKE :title', { title: `%${filters.title}%` });
    }
    if (filters?.type) {
      queryBuilder.andWhere('activity.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      queryBuilder.andWhere('activity.status = :status', { status: filters.status });
    }
    if (filters?.relatedToType) {
      queryBuilder.andWhere('activity.relatedToType = :relatedToType', { relatedToType: filters.relatedToType });
    }
    if (filters?.relatedToId) {
      queryBuilder.andWhere('activity.relatedToId = :relatedToId', { relatedToId: filters.relatedToId });
    }

    // 应用排序
    if (filters?.sortBy && filters?.sortOrder) {
      // 映射前端字段名到数据库字段名
      const sortFieldMap: Record<string, string> = {
        'plannedStartTime': 'activity.plannedStartTime',
        'actualStartTime': 'activity.actualStartTime',
      };
      
      const sortField = sortFieldMap[filters.sortBy];
      if (sortField) {
        const sortOrder = filters.sortOrder === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(sortField, sortOrder);
        // 如果排序字段可能为 NULL，添加 NULLS LAST 或 NULLS FIRST
        // MySQL 不支持 NULLS LAST，但可以通过 COALESCE 或条件排序来处理
        // 这里先使用基本排序，NULL 值会排在最后（DESC）或最前（ASC）
      } else {
        // 无效的排序字段，使用默认排序
        queryBuilder.orderBy('activity.plannedStartTime', 'DESC');
      }
    } else {
      // 默认排序：按计划开始时间降序
      queryBuilder.orderBy('activity.plannedStartTime', 'DESC');
    }

    const [records, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // 获取所有关联对象的ID（过滤掉 undefined）
    const customerIds = records.filter(r => r.relatedToType === RelatedToType.CUSTOMER && r.relatedToId).map(r => r.relatedToId!);
    const contactIds = records.filter(r => r.relatedToType === RelatedToType.CONTACT && r.relatedToId).map(r => r.relatedToId!);
    const opportunityIds = records.filter(r => r.relatedToType === RelatedToType.OPPORTUNITY && r.relatedToId).map(r => r.relatedToId!);
    const leadIds = records.filter(r => r.relatedToType === RelatedToType.LEAD && r.relatedToId).map(r => r.relatedToId!);

    // 批量查询关联对象
    const customers = customerIds.length > 0 ? await this.customerRepository.findBy({ id: In(customerIds) }) : [];
    const contacts = contactIds.length > 0 ? await this.contactRepository.findBy({ id: In(contactIds) }) : [];
    const opportunities = opportunityIds.length > 0 ? await this.opportunityRepository.findBy({ id: In(opportunityIds) }) : [];
    const leads = leadIds.length > 0 ? await this.leadRepository.findBy({ id: In(leadIds) }) : [];

    // 创建映射，确保ID类型一致（都转换为number）
    const customerMap = new Map(customers.map(c => [Number(c.id), c]));
    const contactMap = new Map(contacts.map(c => [Number(c.id), c]));
    const opportunityMap = new Map(opportunities.map(o => [Number(o.id), o]));
    const leadMap = new Map(leads.map(l => [Number(l.id), l]));

    // 批量查询部门信息
    const departmentIds = [...new Set(records.map(a => a.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0 && records.length > 0) {
      // 从第一条记录获取 tenantId
      const tenantId = (records[0] as any).tenantId;
      if (tenantId) {
        const departments = await this.departmentRepository.find({
          where: { id: In(departmentIds), tenantId },
        });
        departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
      }
    }

    // 统一序列化 owner 字段，返回 username（优先昵称，其次系统用户名）
    const activities = records.map((a) => {
      const relatedToId = a.relatedToId ? Number(a.relatedToId) : undefined;
      const customer = a.relatedToType === RelatedToType.CUSTOMER && relatedToId ? customerMap.get(relatedToId) : null;
      const contact = a.relatedToType === RelatedToType.CONTACT && relatedToId ? contactMap.get(relatedToId) : null;
      const opportunity = a.relatedToType === RelatedToType.OPPORTUNITY && relatedToId ? opportunityMap.get(relatedToId) : null;
      const lead = a.relatedToType === RelatedToType.LEAD && relatedToId ? leadMap.get(relatedToId) : null;
      const activityDepartmentId = a.departmentId ? Number(a.departmentId) : null;

      return {
        ...a,
        department: activityDepartmentId && departmentsMap.has(activityDepartmentId)
          ? { id: departmentsMap.get(activityDepartmentId)!.id, name: departmentsMap.get(activityDepartmentId)!.name }
          : null,
        owner: a.owner
          ? {
              id: a.owner.id,
              username: a.owner.nickname || (a as any).owner?.user?.username || null,
              user: a.owner.user
                ? {
                    id: a.owner.user.id,
                    username: a.owner.user.username,
                    avatar: a.owner.user.avatar || null,
                  }
                : null,
            }
          : null,
        // 添加关联对象信息，只返回必要的字段
        customer: customer ? { id: customer.id, name: customer.name } : null,
        contact: contact ? { id: contact.id, name: contact.name } : null,
        opportunity: opportunity ? { id: opportunity.id, title: opportunity.name } : null,
        lead: lead ? { id: lead.id, name: lead.name || lead.company || '线索' } : null,
      };
    });

    return {
      activities,
      total,
      page,
      limit,
    };
  }

  async findActivityById(id: number, memberId: number) {
    // 只有负责人可以查看和更新活动
    // 确保 memberId 是数字类型
    const ownerId = typeof memberId === 'string' ? parseInt(memberId, 10) : memberId;
    
    const activity = await this.activityRepository.findOne({
      where: { id, ownerId },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    return activity;
  }

  async updateActivity(id: number, updateActivityDto: UpdateActivityDto, memberId: number) {
    const activity = await this.findActivityById(id, memberId);

    Object.assign(activity, updateActivityDto);
    return await this.activityRepository.save(activity);
  }

  async deleteActivity(id: number, memberId: number) {
    const activity = await this.findActivityById(id, memberId);
    await this.activityRepository.softDelete(id);
    return { message: '活动删除成功' };
  }

  async deleteBatchActivities(ids: number[], memberId: number) {
    // 验证所有活动都属于当前用户（负责人）
    const activities = await this.activityRepository.find({
      where: { id: In(ids), ownerId: memberId },
    });

    if (activities.length !== ids.length) {
      throw new ForbiddenException('部分活动不存在或无权限删除');
    }

    await this.activityRepository.softDelete(ids);
    return { message: '批量删除活动成功' };
  }

  async startActivity(id: number, memberId: number) {
    const activity = await this.findActivityById(id, memberId);
    
    if (activity.status !== ActivityStatus.PLANNED) {
      throw new ForbiddenException('只能开始计划中的活动');
    }

    activity.status = ActivityStatus.IN_PROGRESS;
    activity.actualStartTime = new Date();

    return await this.activityRepository.save(activity);
  }

  async completeActivity(id: number, outcome: string, memberId: number) {
    const activity = await this.findActivityById(id, memberId);
    
    if (activity.status !== ActivityStatus.IN_PROGRESS) {
      throw new ForbiddenException('只能完成进行中的活动');
    }

    activity.status = ActivityStatus.COMPLETED;
    activity.actualEndTime = new Date();
    activity.outcome = outcome;

    return await this.activityRepository.save(activity);
  }

  async getActivityStats(memberId: number) {
    const totalActivities = await this.activityRepository.count({
      where: { ownerId: memberId },
    });

    const statusStats = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('activity.ownerId = :memberId', { memberId })
      .groupBy('activity.status')
      .getRawMany();

    const typeStats = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('activity.ownerId = :memberId', { memberId })
      .groupBy('activity.type')
      .getRawMany();

    const monthlyStats = await this.activityRepository
      .createQueryBuilder('activity')
      .select('DATE_FORMAT(activity.plannedStartTime, "%Y-%m")', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('activity.ownerId = :memberId', { memberId })
      .andWhere('activity.plannedStartTime IS NOT NULL')
      .groupBy('DATE_FORMAT(activity.plannedStartTime, "%Y-%m")')
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    // 今日活动
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayActivities = await this.activityRepository.count({
      where: {
        ownerId: memberId,
        plannedStartTime: {
          $gte: today,
          $lt: tomorrow,
        } as any,
      },
    });

    return {
      totalActivities,
      statusStats,
      typeStats,
      monthlyStats,
      todayActivities,
    };
  }

  async getUpcomingActivities(memberId: number, days = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const activities = await this.activityRepository.find({
      where: {
        ownerId: memberId,
        plannedStartTime: {
          $gte: startDate,
          $lte: endDate,
        } as any,
        status: ActivityStatus.PLANNED,
      },
      relations: ['owner'],
      order: { plannedStartTime: 'ASC' },
    });

    return activities;
  }
}
