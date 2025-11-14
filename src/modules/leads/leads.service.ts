import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Lead, LeadStatus } from '../../entities/lead.entity';
import { Customer, CustomerType, CustomerPoolType } from '../../entities/customer.entity';
import { Contact, ContactType } from '../../entities/contact.entity';
import { Opportunity, OpportunityStage, OpportunityStatus } from '../../entities/opportunity.entity';
import { Activity, ActivityType, ActivityStatus, RelatedToType } from '../../entities/activity.entity';
import { Member } from '../../entities/member.entity';

export interface CreateLeadDto {
  name?: string;
  company?: string;
  title?: string;
  phone?: string;
  email?: string;
  leadSource?: string;
  rating?: 'hot' | 'warm' | 'cold';
  industry?: string;
  level?: string;
  province?: string;
  city?: string;
  district?: string;
  addressDetail?: string;
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Opportunity) private readonly opportunityRepo: Repository<Opportunity>,
    @InjectRepository(Activity) private readonly activityRepo: Repository<Activity>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateLeadDto, tenantId: number, ownerId: number) {
    const lead = this.leadRepo.create({
      ...dto,
      tenantId,
      ownerId,
      status: 'new',
      leadSource: dto.leadSource || 'other',
    });
    return this.leadRepo.save(lead);
  }

  async findAll(tenantId: number, page = 1, limit = 10) {
    const queryBuilder = this.leadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('lead.tenantId = :tenantId', { tenantId })
      .orderBy('lead.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    // 序列化 owner 字段
    const serialized = items.map((lead) => ({
      ...lead,
      owner: lead.owner
        ? {
            id: lead.owner.id,
            username: lead.owner.nickname || (lead as any).owner?.user?.username || null,
          }
        : null,
    }));

    return { leads: serialized, total, page, limit };
  }

  async convert(leadId: number, tenantId: number, operatorMemberId: number, options?: { amount?: number; expectedCloseDate?: string; assignToMemberId?: number; }) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, tenantId } });
    if (!lead) throw new NotFoundException('线索不存在');
    if (lead.status === 'converted') throw new ForbiddenException('线索已转化');

    return await this.dataSource.transaction(async (manager) => {
      // 创建客户
      const customer = manager.create(Customer, {
        name: lead.company?.trim() ? lead.company : (lead.name?.trim() || '新客户'),
        type: lead.company?.trim() ? CustomerType.COMPANY : CustomerType.INDIVIDUAL,
        poolType: CustomerPoolType.PRIVATE,
        ownerId: options?.assignToMemberId || operatorMemberId,
        tenantId,
        source: lead.leadSource,
        industry: lead.industry,
        level: lead.level,
        province: lead.province,
        city: lead.city,
        district: lead.district,
        addressDetail: lead.addressDetail,
      });
      await manager.save(Customer, customer);

      // 创建联系人
      const contact = manager.create(Contact, {
        name: lead.name?.trim() || '联系人',
        position: lead.title,
        phone: lead.phone,
        email: lead.email,
        type: ContactType.PRIMARY,
        isPrimary: true,
        customerId: customer.id,
        tenantId,
      });
      await manager.save(Contact, contact);

      // 创建商机（可选，默认创建）
      const opportunity = manager.create(Opportunity, {
        name: `${customer.name} - 首次商机`,
        description: '由线索自动转化创建',
        amount: options?.amount ?? 0,
        probability: 0,
        expectedCloseDate: options?.expectedCloseDate ? new Date(options.expectedCloseDate) : null,
        stage: OpportunityStage.INITIAL_CONTACT,
        status: OpportunityStatus.ACTIVE,
        customerId: customer.id,
        ownerId: options?.assignToMemberId || operatorMemberId,
        tenantId,
      });
      await manager.save(Opportunity, opportunity);

      // 创建跟进任务
      const activity = manager.create(Activity, {
        title: `跟进新转化的客户 ${customer.name}`,
        description: '系统自动创建的跟进任务',
        type: ActivityType.TASK,
        status: ActivityStatus.PLANNED,
        plannedStartTime: new Date(),
        plannedEndTime: new Date(Date.now() + 24 * 3600 * 1000),
        relatedToType: RelatedToType.CUSTOMER,
        relatedToId: customer.id,
        ownerId: options?.assignToMemberId || operatorMemberId,
        tenantId,
      });
      await manager.save(Activity, activity);

      // 更新线索
      lead.status = 'converted' as LeadStatus;
      lead.convertedAt = new Date();
      lead.convertedCustomerId = customer.id;
      lead.convertedContactId = contact.id;
      lead.convertedOpportunityId = opportunity.id;
      await manager.save(Lead, lead);

      return { lead, customer, contact, opportunity, activity };
    });
  }
}


