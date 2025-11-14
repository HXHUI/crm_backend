import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Customer, CustomerStatus, CustomerType, CustomerPoolType } from '../../entities/customer.entity';
import { Contact, ContactType } from '../../entities/contact.entity';
import { Member } from '../../entities/member.entity';

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
  poolType?: CustomerPoolType;
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
  poolType?: CustomerPoolType;
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
  ) {}

  async createCustomer(createCustomerDto: CreateCustomerDto, memberId: number, tenantId: number) {
    const { poolType = CustomerPoolType.PRIVATE, ...restDto } = createCustomerDto;
    
    const customer = this.customerRepository.create({
      ...restDto,
      poolType,
      ownerId: poolType === CustomerPoolType.PRIVATE ? memberId : null,
      tenantId,
    });

    return await this.customerRepository.save(customer);
  }

  async findAllCustomers(query: QueryCustomerDto, memberId: number, tenantId: number) {
    const { search, type, status, source, industry, province, city, district, page = 1, limit = 10 } = query;
    
    const queryBuilder = this.customerRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('customer.contacts', 'contacts')
      .where('customer.tenantId = :tenantId')
      .andWhere('(customer.ownerId = :memberId OR customer.poolType = :publicPool)', { 
        tenantId,
        memberId, 
        publicPool: CustomerPoolType.PUBLIC 
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

    // 统一序列化 owner 字段，返回 username（优先昵称，其次系统用户名）
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

  async findCustomerById(id: number, memberId: number, tenantId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id, tenantId },
      relations: ['contacts', 'opportunities'],
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return customer;
  }

  async updateCustomer(id: number, updateCustomerDto: UpdateCustomerDto, memberId: number, tenantId: number) {
    const customer = await this.findCustomerById(id, memberId, tenantId);

    Object.assign(customer, updateCustomerDto);
    return await this.customerRepository.save(customer);
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

  async createContact(customerId: number, createContactDto: CreateContactDto, memberId: number, tenantId: number) {
    // 验证客户是否属于当前成员
    const customer = await this.findCustomerById(customerId, memberId, tenantId);

    const contact = this.contactRepository.create({
      ...createContactDto,
      customerId,
      tenantId,
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
    const totalCustomers = await this.customerRepository.count({
      where: { ownerId: memberId, tenantId },
    });

    const statusStats = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('customer.ownerId = :memberId AND customer.tenantId = :tenantId', { memberId, tenantId })
      .groupBy('customer.status')
      .getRawMany();

    const typeStats = await this.customerRepository
      .createQueryBuilder('customer')
      .select('customer.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('customer.ownerId = :memberId AND customer.tenantId = :tenantId', { memberId, tenantId })
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

    if (customer.poolType === CustomerPoolType.PRIVATE && customer.ownerId) {
      throw new ForbiddenException('客户已被认领');
    }

    customer.poolType = CustomerPoolType.PRIVATE;
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

    customer.poolType = CustomerPoolType.PUBLIC;
    customer.ownerId = null;

    return await this.customerRepository.save(customer);
  }

  // 获取公海客户列表
  async getPublicCustomers(query: QueryCustomerDto, tenantId: number) {
    const { search, type, status, page = 1, limit = 10 } = query;
    
    const queryBuilder = this.customerRepository.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .where('customer.poolType = :poolType AND customer.tenantId = :tenantId', { poolType: CustomerPoolType.PUBLIC, tenantId });

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
}
