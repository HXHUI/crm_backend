import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity, ActivityType, ActivityStatus, RelatedToType, ActivityPriority } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';

export interface CreateActivityDto {
  title: string;
  description?: string;
  type: ActivityType;
  status?: ActivityStatus;
  plannedStartTime: Date;
  plannedEndTime: Date;
  location?: string;
  outcome?: string;
  attachments?: string[];
  participants?: string[];
  relatedToType: RelatedToType;
  relatedToId: number;
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
    // 相关实体校验改由调用方在业务链路中保证；活动表只记录关联
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  async createActivity(createActivityDto: CreateActivityDto, memberId: number, tenantId: number) {
    const activity = this.activityRepository.create({
      ...createActivityDto,
      // 如果前端传入 ownerId（多负责人场景），则按传入值设置；否则默认当前用户
      ownerId: createActivityDto.ownerId || memberId,
      tenantId,
    });

    return await this.activityRepository.save(activity);
  }

  async findAllActivities(tenantId: number, page = 1, limit = 10, filters?: any) {
    const queryBuilder = this.activityRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('activity.tenantId = :tenantId', { tenantId })
      .orderBy('activity.plannedStartTime', 'DESC');
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

    const [records, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // 统一序列化 owner 字段，返回 username（优先昵称，其次系统用户名）
    const activities = records.map((a) => ({
      ...a,
      owner: a.owner
        ? {
            id: a.owner.id,
            username: a.owner.nickname || (a as any).owner?.user?.username || null,
          }
        : null,
    }));

    return {
      activities,
      total,
      page,
      limit,
    };
  }

  async findActivityById(id: number, memberId: number) {
    const activity = await this.activityRepository.findOne({
      where: { id, ownerId: memberId },
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
    // 验证所有活动都属于当前用户
    const activities = await this.activityRepository.find({
      where: { id: { $in: ids } as any, ownerId: memberId },
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
