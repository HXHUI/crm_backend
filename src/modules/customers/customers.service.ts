import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThanOrEqual, IsNull, Not, In } from 'typeorm';
import { Customer, CustomerStatus, CustomerType } from '../../entities/customer.entity';
import { Contact, ContactType } from '../../entities/contact.entity';
import { Member } from '../../entities/member.entity';
import { Activity, RelatedToType, ActivityStatus } from '../../entities/activity.entity';
import { Tenant } from '../../entities/tenant.entity';
import { MemberDepartment } from '../../entities/member-department.entity';
import { Department } from '../../entities/department.entity';
import { CustomerProfile } from '../../entities/customer-profile.entity';
import { CustomerCreditHistory } from '../../entities/customer-credit-history.entity';
import { getConfigFromObject } from '../../common/utils/tenant-config.util';
import { CreateCustomerProfileDto, UpdateCustomerProfileDto, UpdateCreditInfoDto } from './dto/customer-profile.dto';
import { CustomFieldConfigsService } from '../custom-field-configs/custom-field-configs.service';
import { EntityType } from '../../entities/custom-field-config.entity';

export interface CreateCustomerDto {
  name: string;
  code?: string;
  type: CustomerType;
  status?: CustomerStatus;
  companyName?: string;
  industry?: string;
  size?: string;
  description?: string;
  tags?: string[];
  estimatedValue?: number;
  source?: string;
  level?: string;
  ownerId?: number; // 负责人ID，如果有则为私海，无则为公海
  customFields?: Record<string, any>; // 扩展字段
}

export interface UpdateCustomerDto {
  name?: string;
  code?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  companyName?: string;
  industry?: string;
  size?: string;
  description?: string;
  tags?: string[];
  estimatedValue?: number;
  source?: string;
  level?: string;
  customFields?: Record<string, any>; // 扩展字段
}

export interface CreateContactDto {
  name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  telephone?: string;
  type?: ContactType;
  isPrimary?: boolean;
  notes?: string;
  otherContacts?: Record<string, string>;
}

export interface QueryCustomerDto {
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  source?: string;
  industry?: string;
  province?: string;
  city?: string;
  district?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(MemberDepartment)
    private readonly memberDepartmentRepository: Repository<MemberDepartment>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(CustomerCreditHistory)
    private readonly customerCreditHistoryRepository: Repository<CustomerCreditHistory>,
    @Inject(forwardRef(() => CustomFieldConfigsService))
    private readonly customFieldConfigsService?: CustomFieldConfigsService,
  ) {}

  async createCustomer(createCustomerDto: CreateCustomerDto, memberId: number, tenantId: number, departmentId?: number) {
    // 如果有 ownerId，则为私海；否则为公海
    // 如果 ownerId 为 null，明确表示公海客户
    // 如果 ownerId 为 undefined（未指定），默认设置为当前成员（私海）
    let finalOwnerId: number | null;
    if (createCustomerDto.ownerId === null) {
      // 明确设置为 null，表示公海客户
      finalOwnerId = null;
    } else if (createCustomerDto.ownerId !== undefined) {
      // 有明确的 ownerId 值，使用该值（私海客户）
      finalOwnerId = createCustomerDto.ownerId;
    } else {
      // 未指定 ownerId，默认设置为当前成员（私海客户）
      finalOwnerId = memberId;
    }

    // 验证扩展字段
    if (createCustomerDto.customFields && this.customFieldConfigsService) {
      const validation = await this.customFieldConfigsService.validateCustomFields(
        tenantId,
        EntityType.CUSTOMER,
        createCustomerDto.customFields
      );
      if (!validation.valid) {
        throw new BadRequestException(`扩展字段验证失败: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const { customFields, ...customerData } = createCustomerDto;
    const customer = this.customerRepository.create({
      ...customerData,
      ownerId: finalOwnerId,
      tenantId,
      departmentId,
      createdBy: memberId,
      customFields,
    });

    return await this.customerRepository.save(customer);
  }

  /**
   * 获取当前用户及其下级用户的成员ID列表
   * 权限规则：
   * 1. 当前用户自己（总是包含）
   * 2. 如果当前用户是部门负责人，可以看到该部门所有成员的客户
   * 3. 如果当前用户管理的部门有下级部门，可以看到下级部门所有成员的客户（递归）
   * 4. 普通成员只能看到自己的客户
   */
  private async getSubordinateMemberIds(memberId: number, tenantId: number): Promise<number[]> {
    const subordinateMemberIds: number[] = [memberId]; // 总是包含当前用户自己
    
    // 1. 获取当前用户作为负责人的部门（如果当前用户是部门负责人）
    const managedDepartments = await this.departmentRepository.find({
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
      
      const subDepartments = await this.departmentRepository.find({
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
      const subordinateMembers = await this.memberDepartmentRepository.find({
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

  async findAllCustomers(query: QueryCustomerDto, memberId: number, tenantId: number) {
    const { search, type, status, source, industry, province, city, district, page = 1, limit = 50 } = query;
    
    // 获取当前用户及其下级用户的成员ID列表
    const subordinateMemberIds = await this.getSubordinateMemberIds(memberId, tenantId);
    
    const queryBuilder = this.customerRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('customer.contacts', 'contacts')
      .where('customer.tenantId = :tenantId')
      .andWhere('(customer.ownerId IN (:...memberIds))', { 
        tenantId,
        memberIds: subordinateMemberIds
      });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(customer.name LIKE :search OR customer.companyName LIKE :search OR customer.code LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 类型筛选
    if (type) {
      queryBuilder.andWhere('customer.type = :type', { type });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    // 来源筛选
    if (source) {
      queryBuilder.andWhere('customer.source = :source', { source });
    }

    // 行业筛选
    if (industry) {
      queryBuilder.andWhere('customer.industry = :industry', { industry });
    }

    // 地区筛选
    if (province) {
      queryBuilder.andWhere('customer.province = :province', { province });
    }
    if (city) {
      queryBuilder.andWhere('customer.city = :city', { city });
    }
    if (district) {
      queryBuilder.andWhere('customer.district = :district', { district });
    }

    // 排序和分页
    queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [customers, total] = await queryBuilder.getManyAndCount();

    // 批量查询部门信息
    const customerDepartmentIds = [...new Set(customers.map(c => c.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (customerDepartmentIds.length > 0) {
      const departments = await this.departmentRepository.find({
        where: { id: In(customerDepartmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 统一序列化 owner 字段，返回 username（优先昵称，其次系统用户名）
    const serialized = customers.map((c: any) => {
      const customerDepartmentId = c.departmentId ? Number(c.departmentId) : null;
      return {
        ...c,
        department: customerDepartmentId && departmentsMap.has(customerDepartmentId)
          ? { id: departmentsMap.get(customerDepartmentId)!.id, name: departmentsMap.get(customerDepartmentId)!.name }
          : null,
        owner: c.owner
          ? {
              id: c.owner.id,
              username: c.owner.nickname || (c as any).owner?.user?.username || null,
            }
          : null,
      };
    });

    return {
      customers: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCustomerById(id: number, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
      relations: ['contacts', 'opportunities'],
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取扩展字段配置
    if (this.customFieldConfigsService) {
      const fieldConfigs = await this.customFieldConfigsService.getFieldConfigsByEntityType(
        tenantId,
        EntityType.CUSTOMER
      );
      // 将扩展字段配置附加到返回对象
      return {
        ...customer,
        customFieldConfigs: fieldConfigs,
      };
    }

    return customer;
  }

  async updateCustomerStatus(id: number, status: string, memberId: number, tenantId: number) {
    const customer = await this.findCustomerById(id, memberId, tenantId);

    // 验证状态值
    const validStatuses = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('无效的客户状态');
    }

    customer.status = status as CustomerStatus;
    return await this.customerRepository.save(customer);
  }

  async updateCustomer(id: number, updateCustomerDto: UpdateCustomerDto, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 处理扩展字段
    if (updateCustomerDto.customFields !== undefined) {
      // 验证扩展字段
      if (this.customFieldConfigsService) {
        const validation = await this.customFieldConfigsService.validateCustomFields(
          tenantId,
          EntityType.CUSTOMER,
          updateCustomerDto.customFields
        );
        if (!validation.valid) {
          throw new BadRequestException(`扩展字段验证失败: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
      // 合并扩展字段（保留未更新的字段）
      customer.customFields = this.mergeCustomFields(customer.customFields || {}, updateCustomerDto.customFields);
    }

    // 更新其他字段
    const { customFields, ...otherFields } = updateCustomerDto;
    Object.assign(customer, otherFields);

    return await this.customerRepository.save(customer);
  }

  /**
   * 合并扩展字段（保留未更新的字段）
   */
  private mergeCustomFields(existing: Record<string, any>, updates: Record<string, any>): Record<string, any> {
    return {
      ...existing,
      ...updates,
    };
  }

  /**
   * 验证扩展字段值
   */
  async validateCustomFields(tenantId: number, customFields: Record<string, any>): Promise<{ valid: boolean; errors: Array<{ field: string; message: string }> }> {
    if (!this.customFieldConfigsService) {
      return { valid: true, errors: [] };
    }
    return await this.customFieldConfigsService.validateCustomFields(tenantId, EntityType.CUSTOMER, customFields);
  }

  async deleteCustomer(id: number, memberId: number, tenantId: number) {
    const customer = await this.findCustomerById(id, memberId, tenantId);
    await this.customerRepository.softDelete(id);
  }

  async deleteBatchCustomers(ids: number[], memberId: number, tenantId: number) {
    // 验证所有客户都属于当前成员
    const customers = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.id IN (:...ids)', { ids })
      .andWhere('customer.tenantId = :tenantId', { tenantId })
      .getMany();

    if (customers.length !== ids.length) {
      throw new ForbiddenException('部分客户不存在或无权限删除');
    }

    await this.customerRepository.softDelete(ids);
  }

  async createContact(customerId: number, createContactDto: CreateContactDto, memberId: number, tenantId: number, departmentId?: number) {
    // 验证客户是否属于当前成员
    const customer = await this.findCustomerById(customerId, memberId, tenantId);

    const contact = this.contactRepository.create({
      ...createContactDto,
      customerId,
      tenantId,
      departmentId,
      createdBy: memberId,
    });

    // 如果设置为主要联系人，先将其他联系人设为非主要
    if (createContactDto.isPrimary) {
      await this.contactRepository.update(
        { customerId },
        { isPrimary: false },
      );
    }

    return await this.contactRepository.save(contact);
  }

  async updateContact(
    contactId: number,
    updateContactDto: Partial<CreateContactDto>,
    memberId: number,
    tenantId: number,
  ) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ['customer'],
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 验证联系人所属的客户是否属于当前成员
    if (contact.customer.ownerId !== memberId || contact.customer.tenantId !== tenantId) {
      throw new ForbiddenException('无权限操作此联系人');
    }

    // 如果设置为主要联系人，先将其他联系人设为非主要
    if (updateContactDto.isPrimary) {
      await this.contactRepository.update(
        { customerId: contact.customerId },
        { isPrimary: false },
      );
    }

    Object.assign(contact, updateContactDto);
    return await this.contactRepository.save(contact);
  }

  async deleteContact(contactId: number, memberId: number, tenantId: number) {
    const contact = await this.contactRepository.findOne({
      where: { id: contactId },
      relations: ['customer'],
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 验证联系人所属的客户是否属于当前成员
    if (contact.customer.ownerId !== memberId || contact.customer.tenantId !== tenantId) {
      throw new ForbiddenException('无权限操作此联系人');
    }

    await this.contactRepository.softDelete(contactId);
    return { message: '联系人删除成功' };
  }

  async getCustomerStats(memberId: number, tenantId: number) {
    // 获取当前用户及其下级用户的成员ID列表
    const subordinateMemberIds = await this.getSubordinateMemberIds(memberId, tenantId);
    
    const totalCustomers = await this.customerRepository.count({
      where: { ownerId: In(subordinateMemberIds), tenantId },
    });

    const statusStats = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('customer.ownerId IN (:...memberIds) AND customer.tenantId = :tenantId', { 
        memberIds: subordinateMemberIds, 
        tenantId 
      })
      .groupBy('customer.status')
      .getRawMany();

    const typeStats = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('customer.ownerId IN (:...memberIds) AND customer.tenantId = :tenantId', { 
        memberIds: subordinateMemberIds, 
        tenantId 
      })
      .groupBy('customer.type')
      .getRawMany();

    return {
      totalCustomers,
      statusStats,
      typeStats,
    };
  }

  // 认领客户（从公海转入私海）
  async claimCustomer(customerId: number, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({ where: { id: customerId, tenantId } });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 如果客户已有负责人，说明已被认领
    if (customer.ownerId) {
      throw new ForbiddenException('客户已被认领');
    }

    customer.ownerId = memberId;

    return await this.customerRepository.save(customer);
  }

  // 回收客户（从私海转入公海）
  async releaseCustomer(customerId: number, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({ where: { id: customerId, tenantId } });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    if (customer.ownerId !== memberId) {
      throw new ForbiddenException('无权限回收此客户');
    }

    customer.ownerId = null;

    return await this.customerRepository.save(customer);
  }

  // 获取公海客户列表
  async getPublicCustomers(query: QueryCustomerDto, tenantId: number) {
    const { search, type, status, page = 1, limit = 50 } = query;
    
    const queryBuilder = this.customerRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .where('customer.ownerId IS NULL AND customer.tenantId = :tenantId', { tenantId });

    if (search) {
      queryBuilder.andWhere(
        '(customer.name LIKE :search OR customer.companyName LIKE :search OR customer.code LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (type) {
      queryBuilder.andWhere('customer.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    const [customers, total] = await queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const serialized = customers.map((c) => ({
      ...c,
      owner: c.owner
        ? {
            id: c.owner.id,
            username: c.owner.nickname || (c as any).owner?.user?.username || null,
          }
        : null,
    }));

    return {
      customers: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 自动将超过配置天数未联系的客户回到公海
   * @param tenantId 租户ID
   * @param days 未联系天数（可选，如果不提供则从租户配置读取）
   * @returns 返回回到公海的客户数量和详情
   */
  async autoReturnCustomersToPool(tenantId: number, days?: number) {
    // 获取租户配置
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      select: ['id', 'config'],
    });

    const config = getConfigFromObject(tenant?.config);
    const autoReturnDays = days ?? config.customerPoolAutoReturnDays;

    // 计算截止日期：当前日期减去配置天数
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - autoReturnDays);
    cutoffDate.setHours(0, 0, 0, 0);

    // 查询所有私海客户（有负责人的客户）
    const privateCustomers = await this.customerRepository.find({
      where: {
        tenantId,
        ownerId: Not(IsNull()),
      },
      select: ['id', 'name', 'ownerId'],
    });

    const returnedCustomers: Array<{ id: number; name: string; lastContactDate: Date | null }> = [];

    // 对每个客户检查最后联系时间
    for (const customer of privateCustomers) {
      // 查找该客户的最后联系活动（已完成的活动）
      const lastActivity = await this.activityRepository.findOne({
        where: {
          tenantId,
          relatedToType: RelatedToType.CUSTOMER,
          relatedToId: customer.id,
          status: ActivityStatus.COMPLETED,
        },
        order: {
          actualEndTime: 'DESC',
        },
        select: ['actualEndTime', 'plannedStartTime'],
      });

      // 确定最后联系时间：优先使用实际结束时间，否则使用计划开始时间
      let lastContactDate: Date | null = null;
      if (lastActivity) {
        lastContactDate = lastActivity.actualEndTime || lastActivity.plannedStartTime || null;
      }

      // 如果没有活动记录，使用客户创建时间作为最后联系时间
      if (!lastContactDate) {
        const customerWithDates = await this.customerRepository.findOne({
          where: { id: customer.id },
          select: ['createdAt'],
        });
        lastContactDate = customerWithDates?.createdAt || null;
      }

      // 如果最后联系时间早于截止日期，将客户回到公海
      if (lastContactDate && lastContactDate < cutoffDate) {
        await this.customerRepository.update(customer.id, {
          ownerId: null,
        });

        returnedCustomers.push({
          id: customer.id,
          name: customer.name,
          lastContactDate,
        });
      }
    }

    return {
      count: returnedCustomers.length,
      customers: returnedCustomers,
      cutoffDate: cutoffDate.toISOString(),
      autoReturnDays,
    };
  }

  // ========== 客户合作习惯与信用信息相关方法 ==========

  /**
   * 获取客户合作与信用信息
   */
  async getCustomerProfile(customerId: number, tenantId: number): Promise<CustomerProfile | null> {
    const profile = await this.customerProfileRepository.findOne({
      where: {
        customerId,
        tenantId,
        deletedAt: IsNull(),
      },
      relations: ['customer'],
    });

    return profile || null;
  }

  /**
   * 创建或更新客户合作与信用信息
   */
  async createOrUpdateCustomerProfile(
    customerId: number,
    dto: CreateCustomerProfileDto | UpdateCustomerProfileDto,
    tenantId: number,
  ): Promise<CustomerProfile> {
    // 检查客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 查找现有profile
    let profile = await this.customerProfileRepository.findOne({
      where: { customerId, tenantId, deletedAt: IsNull() },
    });

    if (profile) {
      // 更新
      Object.assign(profile, dto);
      profile.tenantId = tenantId;
      return await this.customerProfileRepository.save(profile);
    } else {
      // 创建
      profile = this.customerProfileRepository.create({
        customerId,
        tenantId,
        ...dto,
      });
      return await this.customerProfileRepository.save(profile);
    }
  }

  /**
   * 更新信用信息并记录历史
   */
  async updateCreditInfo(
    customerId: number,
    dto: UpdateCreditInfoDto,
    changedBy: number,
    tenantId: number,
  ): Promise<{ profile: CustomerProfile; customer: Customer; history: CustomerCreditHistory }> {
    // 检查客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 获取现有profile
    let profile = await this.customerProfileRepository.findOne({
      where: { customerId, tenantId, deletedAt: IsNull() },
    });

    // 记录变更前的值
    const oldLimit = profile?.creditLimit ?? null;
    const oldTier = profile?.creditTier ?? null;
    const oldRating = customer.level ?? null;

    // 更新profile
    if (!profile) {
      profile = this.customerProfileRepository.create({
        customerId,
        tenantId,
      });
    }

    if (dto.creditLimit !== undefined) {
      profile.creditLimit = dto.creditLimit;
    }
    if (dto.creditTier !== undefined) {
      profile.creditTier = dto.creditTier;
    }

    const savedProfile = await this.customerProfileRepository.save(profile);

    // 更新客户等级（如果提供）
    if (dto.level !== undefined) {
      customer.level = dto.level;
      await this.customerRepository.save(customer);
    }

    // 检查是否有变更
    const hasLimitChange = dto.creditLimit !== undefined && dto.creditLimit !== oldLimit;
    const hasTierChange = dto.creditTier !== undefined && dto.creditTier !== oldTier;
    const hasRatingChange = dto.level !== undefined && dto.level !== oldRating;

    // 如果有变更，记录历史
    if (hasLimitChange || hasTierChange || hasRatingChange) {
      const history = this.customerCreditHistoryRepository.create({
        customerId,
        tenantId,
        oldLimit,
        newLimit: dto.creditLimit ?? oldLimit,
        oldTier: oldTier ?? null,
        newTier: dto.creditTier ?? oldTier ?? null,
        oldRating: oldRating ?? null,
        newRating: dto.level ?? oldRating ?? null,
        changeReason: dto.changeReason,
        changedBy,
      });

      const savedHistory = await this.customerCreditHistoryRepository.save(history);

      return {
        profile: savedProfile,
        customer,
        history: savedHistory,
      };
    }

    return {
      profile: savedProfile,
      customer,
      history: null as any,
    };
  }

  /**
   * 获取信用变更历史
   */
  async getCreditHistory(customerId: number, tenantId: number): Promise<CustomerCreditHistory[]> {
    return await this.customerCreditHistoryRepository.find({
      where: {
        customerId,
        tenantId,
      },
      relations: ['changer', 'changer.user'],
      order: {
        createdAt: 'DESC',
      },
    });
  }
}
