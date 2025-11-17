import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quote, QuoteStatus } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';

export interface CreateQuoteItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  notes?: string;
}

export interface CreateQuoteDto {
  quoteNumber: string;
  customerId: number;
  contactId?: number;
  opportunityId?: number;
  quoteDate: Date;
  expiryDate?: Date;
  status?: QuoteStatus;
  notes?: string;
  items: CreateQuoteItemDto[];
}

export interface UpdateQuoteDto {
  quoteNumber?: string;
  customerId?: number;
  contactId?: number;
  opportunityId?: number;
  quoteDate?: Date;
  expiryDate?: Date;
  status?: QuoteStatus;
  notes?: string;
  items?: CreateQuoteItemDto[];
}

export interface QueryQuoteDto {
  search?: string;
  customerId?: number;
  opportunityId?: number;
  status?: QuoteStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    private readonly dataSource: DataSource,
  ) {}

  async createQuote(createQuoteDto: CreateQuoteDto, memberId: number, tenantId: number) {
    // 验证客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: createQuoteDto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 验证联系人是否存在（如果提供）
    if (createQuoteDto.contactId) {
      const contact = await this.contactRepository.findOne({
        where: { id: createQuoteDto.contactId, customerId: createQuoteDto.customerId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException('联系人不存在或不属于该客户');
      }
    }

    // 验证商机是否存在（如果提供）
    if (createQuoteDto.opportunityId) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: createQuoteDto.opportunityId, tenantId },
      });
      if (!opportunity) {
        throw new NotFoundException('商机不存在');
      }
    }

    // 计算总金额
    const totalAmount = createQuoteDto.items.reduce((sum, item) => {
      const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      return sum + amount;
    }, 0);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建报价
      const quote = this.quoteRepository.create({
        quoteNumber: createQuoteDto.quoteNumber,
        customerId: createQuoteDto.customerId,
        contactId: createQuoteDto.contactId,
        opportunityId: createQuoteDto.opportunityId,
        quoteDate: createQuoteDto.quoteDate,
        expiryDate: createQuoteDto.expiryDate,
        status: createQuoteDto.status || QuoteStatus.DRAFT,
        notes: createQuoteDto.notes,
        totalAmount,
        ownerId: memberId,
        tenantId,
      });

      const savedQuote = await queryRunner.manager.save(quote);

      // 创建报价明细
      const quoteItems = createQuoteDto.items.map(item => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return this.quoteItemRepository.create({
          quoteId: savedQuote.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          amount,
          notes: item.notes,
          tenantId,
        });
      });

      await queryRunner.manager.save(quoteItems);

      await queryRunner.commitTransaction();

      // 返回完整的报价信息
      return await this.quoteRepository.findOne({
        where: { id: savedQuote.id },
        relations: ['customer', 'contact', 'opportunity', 'items', 'items.product'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllQuotes(query: QueryQuoteDto, memberId: number, tenantId: number) {
    const { search, customerId, opportunityId, status, page = 1, limit = 10 } = query;

    const queryBuilder = this.quoteRepository.createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.contact', 'contact')
      .leftJoinAndSelect('quote.opportunity', 'opportunity')
      .leftJoinAndSelect('quote.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .where('quote.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(quote.quoteNumber LIKE :search OR customer.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 客户筛选
    if (customerId) {
      queryBuilder.andWhere('quote.customerId = :customerId', { customerId });
    }

    // 商机筛选
    if (opportunityId) {
      queryBuilder.andWhere('quote.opportunityId = :opportunityId', { opportunityId });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('quote.status = :status', { status });
    }

    // 排序和分页
    queryBuilder
      .orderBy('quote.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [quotes, total] = await queryBuilder.getManyAndCount();

    return {
      quotes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findQuoteById(id: number, memberId: number, tenantId: number) {
    const quote = await this.quoteRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'contact', 'opportunity', 'items', 'items.product', 'owner'],
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    return quote;
  }

  async updateQuote(id: number, updateQuoteDto: UpdateQuoteDto, memberId: number, tenantId: number) {
    const quote = await this.findQuoteById(id, memberId, tenantId);

    // 验证联系人（如果更新了客户或联系人）
    const customerId = updateQuoteDto.customerId || quote.customerId;
    if (updateQuoteDto.contactId) {
      const contact = await this.contactRepository.findOne({
        where: { id: updateQuoteDto.contactId, customerId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException('联系人不存在或不属于该客户');
      }
    } else if (updateQuoteDto.customerId && quote.contactId) {
      // 如果更新了客户，但原报价有联系人，需要清除联系人（因为联系人属于原客户）
      updateQuoteDto.contactId = undefined;
    }

    // 如果更新了明细，需要重新计算总金额
    let totalAmount = quote.totalAmount;
    if (updateQuoteDto.items) {
      totalAmount = updateQuoteDto.items.reduce((sum, item) => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return sum + amount;
      }, 0);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新报价基本信息
      if (updateQuoteDto.items) {
        // 删除旧的明细
        await queryRunner.manager.delete(QuoteItem, { quoteId: id });

        // 创建新的明细
        const quoteItems = updateQuoteDto.items.map(item => {
          const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
          return this.quoteItemRepository.create({
            quoteId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            amount,
            notes: item.notes,
            tenantId,
          });
        });

        await queryRunner.manager.save(quoteItems);
      }

      // 更新报价
      Object.assign(quote, updateQuoteDto);
      if (updateQuoteDto.items) {
        quote.totalAmount = totalAmount;
      }
      await queryRunner.manager.save(quote);

      await queryRunner.commitTransaction();

      return await this.findQuoteById(id, memberId, tenantId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteQuote(id: number, memberId: number, tenantId: number) {
    const quote = await this.findQuoteById(id, memberId, tenantId);
    await this.quoteRepository.softDelete(id);
  }
}

