import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Visit, VisitStatus } from '../../entities/visit.entity';
import { Department } from '../../entities/department.entity';
import { CreateVisitDto, UpdateVisitDto, QueryVisitDto, CheckInDto } from './dto/visit.dto';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visitRepository: Repository<Visit>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}


  /**
   * 创建拜访记录
   */
  async create(createDto: CreateVisitDto, memberId: number, tenantId: number, departmentId?: number): Promise<Visit> {
    // 计算费用总额
    if (createDto.expenses) {
      const expenses = createDto.expenses;
      expenses.total =
        (expenses.travel || 0) + (expenses.entertainment || 0) + (expenses.other || 0);
      if (!expenses.currency) {
        expenses.currency = 'CNY';
      }
    }

    const visit = this.visitRepository.create({
      ...createDto,
      plannedStartTime: new Date(createDto.plannedStartTime),
      plannedEndTime: new Date(createDto.plannedEndTime),
      ownerId: createDto.ownerId || memberId,
      assignedBy: createDto.assignedBy || memberId,
      tenantId,
      departmentId,
      createdBy: memberId,
    });

    return await this.visitRepository.save(visit);
  }

  /**
   * 查询拜访列表
   */
  async findAll(queryDto: QueryVisitDto, tenantId: number) {
    const { type, status, customerId, contactId, opportunityId, ownerId, startDate, endDate, page = 1, limit = 50 } = queryDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('visit.customer', 'customer')
      .leftJoinAndSelect('visit.contact', 'contact')
      .leftJoinAndSelect('visit.opportunity', 'opportunity')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL');

    if (type) {
      queryBuilder.andWhere('visit.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('visit.status = :status', { status });
    }

    if (customerId) {
      queryBuilder.andWhere('visit.customerId = :customerId', { customerId });
    }

    if (contactId) {
      queryBuilder.andWhere('visit.contactId = :contactId', { contactId });
    }

    if (opportunityId) {
      queryBuilder.andWhere('visit.opportunityId = :opportunityId', { opportunityId });
    }

    if (ownerId) {
      queryBuilder.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      queryBuilder.andWhere('visit.plannedStartTime >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('visit.plannedStartTime <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    const [visits, total] = await queryBuilder
      .orderBy('visit.plannedStartTime', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // 批量查询部门信息
    const departmentIds = [...new Set(visits.map(v => v.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.departmentRepository.find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 添加部门信息到返回数据
    const visitsWithDepartment = visits.map(v => {
      const visitDepartmentId = v.departmentId ? Number(v.departmentId) : null;
      return {
        ...v,
        department: visitDepartmentId && departmentsMap.has(visitDepartmentId)
          ? { id: departmentsMap.get(visitDepartmentId)!.id, name: departmentsMap.get(visitDepartmentId)!.name }
          : null,
      };
    });

    return {
      visits: visitsWithDepartment,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 根据ID查询拜访详情
   */
  async findOne(id: number, tenantId: number): Promise<Visit> {
    const visit = await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('visit.customer', 'customer')
      .leftJoinAndSelect('visit.contact', 'contact')
      .leftJoinAndSelect('visit.opportunity', 'opportunity')
      .where('visit.id = :id', { id })
      .andWhere('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .getOne();

    if (!visit) {
      throw new NotFoundException('拜访记录不存在');
    }

    return visit;
  }

  /**
   * 更新拜访记录
   */
  async update(id: number, updateDto: UpdateVisitDto, tenantId: number): Promise<Visit> {
    const visit = await this.findOne(id, tenantId);

    // 计算费用总额
    if (updateDto.expenses) {
      const expenses = updateDto.expenses;
      expenses.total =
        (expenses.travel || 0) + (expenses.entertainment || 0) + (expenses.other || 0);
      if (!expenses.currency) {
        expenses.currency = 'CNY';
      }
    }

    // 转换日期字符串为 Date 对象
    if (updateDto.plannedStartTime) {
      updateDto.plannedStartTime = new Date(updateDto.plannedStartTime) as any;
    }
    if (updateDto.plannedEndTime) {
      updateDto.plannedEndTime = new Date(updateDto.plannedEndTime) as any;
    }
    if (updateDto.actualStartTime) {
      updateDto.actualStartTime = new Date(updateDto.actualStartTime) as any;
    }
    if (updateDto.actualEndTime) {
      updateDto.actualEndTime = new Date(updateDto.actualEndTime) as any;
    }

    Object.assign(visit, updateDto);
    return await this.visitRepository.save(visit);
  }

  /**
   * 删除拜访记录（软删除）
   */
  async remove(id: number, tenantId: number): Promise<void> {
    const visit = await this.findOne(id, tenantId);
    await this.visitRepository.softDelete(id);
  }

  /**
   * 批量删除拜访记录
   */
  async batchRemove(ids: number[], tenantId: number): Promise<void> {
    const visits = await this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.id IN (:...ids)', { ids })
      .andWhere('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .getMany();

    if (visits.length !== ids.length) {
      throw new NotFoundException('部分拜访记录不存在');
    }

    await this.visitRepository.softDelete(ids);
  }

  /**
   * 签到
   */
  async checkIn(id: number, checkInDto: CheckInDto, tenantId: number): Promise<Visit> {
    const visit = await this.findOne(id, tenantId);

    // 更新签到信息
    visit.checkInTime = new Date();

    if (checkInDto.checkInPhoto) {
      visit.checkInPhoto = checkInDto.checkInPhoto;
    }

    // 如果状态是计划中，自动更新为进行中
    if (visit.status === VisitStatus.PLANNED) {
      visit.status = VisitStatus.IN_PROGRESS;
      visit.actualStartTime = visit.checkInTime;
    }

    return await this.visitRepository.save(visit);
  }

  /**
   * 开始拜访
   */
  async startVisit(id: number, tenantId: number): Promise<Visit> {
    const visit = await this.findOne(id, tenantId);

    if (visit.status !== VisitStatus.PLANNED) {
      throw new BadRequestException('只有计划中的拜访才能开始');
    }

    visit.status = VisitStatus.IN_PROGRESS;
    visit.actualStartTime = new Date();

    return await this.visitRepository.save(visit);
  }

  /**
   * 完成拜访
   */
  async completeVisit(id: number, result?: string, feedback?: string, nextAction?: string, tenantId?: number): Promise<Visit> {
    const visit = tenantId ? await this.findOne(id, tenantId) : await this.visitRepository.findOne({ where: { id } });

    if (!visit) {
      throw new NotFoundException('拜访记录不存在');
    }

    if (visit.status === VisitStatus.COMPLETED) {
      throw new BadRequestException('拜访已完成');
    }

    if (visit.status === VisitStatus.CANCELLED) {
      throw new BadRequestException('已取消的拜访不能完成');
    }

    visit.status = VisitStatus.COMPLETED;
    visit.actualEndTime = new Date();

    if (result) {
      visit.result = result;
    }

    if (feedback) {
      visit.feedback = feedback;
    }

    if (nextAction) {
      visit.nextAction = nextAction;
    }

    return await this.visitRepository.save(visit);
  }

  /**
   * 取消拜访
   */
  async cancelVisit(id: number, tenantId: number): Promise<Visit> {
    const visit = await this.findOne(id, tenantId);

    if (visit.status === VisitStatus.COMPLETED) {
      throw new BadRequestException('已完成的拜访不能取消');
    }

    visit.status = VisitStatus.CANCELLED;

    return await this.visitRepository.save(visit);
  }

  /**
   * 获取拜访统计
   */
  async getVisitStats(tenantId: number, ownerId?: number, startDate?: Date, endDate?: Date) {
    const queryBuilder = this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL');

    if (ownerId) {
      queryBuilder.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      queryBuilder.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const total = await queryBuilder.getCount();

    const completedQuery = this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .andWhere('visit.status = :status', { status: VisitStatus.COMPLETED });

    if (ownerId) {
      completedQuery.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      completedQuery.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      completedQuery.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const completed = await completedQuery.getCount();

    const inProgressQuery = this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .andWhere('visit.status = :status', { status: VisitStatus.IN_PROGRESS });

    if (ownerId) {
      inProgressQuery.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      inProgressQuery.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      inProgressQuery.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const inProgress = await inProgressQuery.getCount();

    const plannedQuery = this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .andWhere('visit.status = :status', { status: VisitStatus.PLANNED });

    if (ownerId) {
      plannedQuery.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      plannedQuery.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      plannedQuery.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const planned = await plannedQuery.getCount();

    // 统计费用
    const expensesQuery = this.visitRepository
      .createQueryBuilder('visit')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .andWhere('visit.expenses IS NOT NULL');

    if (ownerId) {
      expensesQuery.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      expensesQuery.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      expensesQuery.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const visitsWithExpenses = await expensesQuery.getMany();

    let totalExpenses = 0;
    visitsWithExpenses.forEach((visit) => {
      if (visit.expenses?.total) {
        totalExpenses += visit.expenses.total;
      }
    });

    // 按类型统计
    const typeStats = await this.visitRepository
      .createQueryBuilder('visit')
      .select('visit.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL');

    if (ownerId) {
      typeStats.andWhere('visit.ownerId = :ownerId', { ownerId });
    }

    if (startDate) {
      typeStats.andWhere('visit.plannedStartTime >= :startDate', { startDate });
    }

    if (endDate) {
      typeStats.andWhere('visit.plannedStartTime <= :endDate', { endDate });
    }

    const typeStatsResult = await typeStats.groupBy('visit.type').getRawMany();

    return {
      total,
      completed,
      inProgress,
      planned,
      cancelled: total - completed - inProgress - planned,
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : '0.00',
      totalExpenses,
      typeStats: typeStatsResult,
    };
  }

  /**
   * 获取客户的拜访记录
   */
  async getVisitsByCustomer(customerId: number, tenantId: number): Promise<Visit[]> {
    return await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('visit.contact', 'contact')
      .where('visit.customerId = :customerId', { customerId })
      .andWhere('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .orderBy('visit.plannedStartTime', 'DESC')
      .getMany();
  }

  /**
   * 获取联系人的拜访记录
   */
  async getVisitsByContact(contactId: number, tenantId: number): Promise<Visit[]> {
    return await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('visit.customer', 'customer')
      .where('visit.contactId = :contactId', { contactId })
      .andWhere('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.deletedAt IS NULL')
      .orderBy('visit.plannedStartTime', 'DESC')
      .getMany();
  }

  /**
   * 获取即将到来的拜访（用于提醒）
   */
  async getUpcomingVisits(ownerId: number, tenantId: number, days: number = 7): Promise<Visit[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    return await this.visitRepository
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.customer', 'customer')
      .leftJoinAndSelect('visit.contact', 'contact')
      .where('visit.ownerId = :ownerId', { ownerId })
      .andWhere('visit.tenantId = :tenantId', { tenantId })
      .andWhere('visit.status IN (:...statuses)', {
        statuses: [VisitStatus.PLANNED, VisitStatus.IN_PROGRESS],
      })
      .andWhere('visit.plannedStartTime >= :now', { now })
      .andWhere('visit.plannedStartTime <= :futureDate', { futureDate })
      .andWhere('visit.deletedAt IS NULL')
      .orderBy('visit.plannedStartTime', 'ASC')
      .getMany();
  }
}

