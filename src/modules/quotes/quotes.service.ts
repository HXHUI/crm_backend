import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Quote, QuoteStatus } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Department } from '../../entities/department.entity';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { TenantService, TenantPricingConfig } from '../tenant/tenant.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { WorkflowService } from '../workflow/workflow.service';
import { BusinessType } from '../../entities/workflow-template.entity';
import { InstanceStatus } from '../../entities/workflow-instance.entity';

export interface CreateQuoteItemDto {
  productId: number;
  quantity: number;
  packagingUnit?: string;  // 包装单位（显示用）
  packagingSpec?: string;   // 包装规格说明（显示用）
  unitPrice: number;
  priceComponents?: Record<string, number>;  // 价格组成项（复杂模式）
  discount?: number;
  taxRate?: number;  // 税率(%)
  unitPriceExclTax?: number;  // 不含税单价
  taxAmount?: number;  // 税金
  amountExclTax?: number;  // 不含税金额
  notes?: string;
}

export interface CreateQuoteDto {
  quoteNumber?: string;  // 可选，如果不提供则自动生成
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
    private readonly numberGeneratorService: NumberGeneratorService,
    private readonly tenantService: TenantService,
    private readonly pricingCalculator: PricingCalculatorService,
    private readonly workflowInstanceService: WorkflowInstanceService,
    private readonly workflowService: WorkflowService,
  ) {}

  async createQuote(createQuoteDto: CreateQuoteDto, memberId: number, tenantId: number, departmentId?: number) {
    console.log('=== 开始创建报价 ===');
    console.log('createQuoteDto:', JSON.stringify(createQuoteDto, null, 2));
    console.log('memberId:', memberId, 'tenantId:', tenantId);
    console.log('numberGeneratorService 是否存在:', !!this.numberGeneratorService);
    
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

    // 获取租户价格配置
    const pricingConfig: TenantPricingConfig = await this.tenantService.getPricingConfig(tenantId);

    // 计算每个明细项的单价和金额，并计算总金额（含税与不含税）
    let totalAmount = 0;
    let totalAmountExclTax = 0;
    let totalTaxAmount = 0;
    const processedItems = await Promise.all(
      createQuoteDto.items.map(async (item) => {
        const result = await this.pricingCalculator.calculateItemAmounts(
          {
            unitPrice: item.unitPrice,
            priceComponents: item.priceComponents,
            quantity: item.quantity,
            discount: item.discount,
            taxRate: item.taxRate,
          },
          pricingConfig,
        );

        totalAmount += result.amount;
        totalAmountExclTax += result.amountExclTax;
        totalTaxAmount += result.taxAmount;

        return {
          ...item,
          unitPrice: result.unitPrice,
          amount: result.amount,
          priceComponents: result.priceComponents,
          taxRate: result.taxRate,
          unitPriceExclTax: result.unitPriceExclTax,
          amountExclTax: result.amountExclTax,
          taxAmount: result.taxAmount,
        };
      }),
    );

    // 如果没有提供单号或为空字符串，则自动生成
    let quoteNumber: string;
    console.log('创建报价 - 接收到的数据:', { quoteNumber: createQuoteDto.quoteNumber, tenantId });
    
    if (createQuoteDto.quoteNumber && typeof createQuoteDto.quoteNumber === 'string' && createQuoteDto.quoteNumber.trim()) {
      quoteNumber = createQuoteDto.quoteNumber.trim();
      console.log('使用提供的报价单号:', quoteNumber);
    } else {
      // 确保单号生成服务已注入
      if (!this.numberGeneratorService) {
        console.error('单号生成服务未初始化');
        throw new BadRequestException('单号生成服务未初始化');
      }
      try {
        console.log('开始生成报价单号, tenantId:', tenantId);
        quoteNumber = await this.numberGeneratorService.generateQuoteNumber(tenantId);
        console.log('生成的报价单号:', quoteNumber);
        if (!quoteNumber || !quoteNumber.trim()) {
          throw new Error('生成的报价单号为空');
        }
      } catch (error) {
        console.error('生成报价单号失败:', error);
        throw new BadRequestException(`生成报价单号失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
    
    if (!quoteNumber || !quoteNumber.trim()) {
      console.error('报价单号验证失败，quoteNumber:', quoteNumber);
      throw new BadRequestException('报价单号不能为空');
    }
    
    console.log('最终使用的报价单号:', quoteNumber);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建报价
      console.log('准备创建报价实体, quoteNumber:', quoteNumber, '类型:', typeof quoteNumber);
      const quoteData = {
        quoteNumber,
        customerId: createQuoteDto.customerId,
        contactId: createQuoteDto.contactId,
        opportunityId: createQuoteDto.opportunityId,
        quoteDate: createQuoteDto.quoteDate,
        expiryDate: createQuoteDto.expiryDate,
        status: createQuoteDto.status || QuoteStatus.DRAFT,
        notes: createQuoteDto.notes,
        totalAmount,
        totalAmountExclTax,
        taxAmount: totalTaxAmount,
        ownerId: memberId,
        tenantId,
        departmentId,
        createdBy: memberId,
      };
      console.log('创建报价的数据:', JSON.stringify(quoteData, null, 2));
      console.log('quoteData.quoteNumber 值:', quoteData.quoteNumber, '类型:', typeof quoteData.quoteNumber);
      
      // 确保 quoteNumber 有值
      if (!quoteData.quoteNumber) {
        console.error('quoteData.quoteNumber 为空，无法创建实体');
        throw new BadRequestException('报价单号不能为空，无法创建报价');
      }
      
      const quote = this.quoteRepository.create(quoteData);
      console.log('创建的报价实体:', quote);
      console.log('报价实体的quoteNumber:', quote.quoteNumber);
      console.log('报价实体所有属性:', Object.keys(quote));

      const savedQuote = await queryRunner.manager.save(quote);
      console.log('保存后的报价:', savedQuote);

      // 创建报价明细（使用已计算好的单价、金额、税额和价格组成项）
      const quoteItems = processedItems.map(item =>
        this.quoteItemRepository.create({
          quoteId: savedQuote.id,
          productId: item.productId,
          quantity: item.quantity,
          packagingUnit: item.packagingUnit,
          packagingSpec: item.packagingSpec,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          amount: item.amount,
          taxRate: item.taxRate ?? 0,
          unitPriceExclTax: item.unitPriceExclTax ?? 0,
          amountExclTax: item.amountExclTax ?? 0,
          taxAmount: item.taxAmount ?? 0,
          notes: item.notes,
          priceComponents: (item as any).priceComponents,
          tenantId,
        }),
      );

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
    const { search, customerId, opportunityId, status, page = 1, limit = 50 } = query;

    const queryBuilder = this.quoteRepository.createQueryBuilder('quote')
      .leftJoinAndSelect('quote.customer', 'customer')
      .leftJoinAndSelect('quote.contact', 'contact')
      .leftJoinAndSelect('quote.opportunity', 'opportunity')
      .leftJoinAndSelect('quote.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('quote.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'creatorUser')
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

    // 批量查询部门信息
    const departmentIds = [...new Set(quotes.map(q => q.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.dataSource.getRepository(Department).find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 添加部门信息到返回数据
    const quotesWithDepartment = quotes.map(q => {
      const quoteDepartmentId = q.departmentId ? Number(q.departmentId) : null;
      return {
        ...q,
        department: quoteDepartmentId && departmentsMap.has(quoteDepartmentId)
          ? { id: departmentsMap.get(quoteDepartmentId)!.id, name: departmentsMap.get(quoteDepartmentId)!.name }
          : null,
      };
    });

    return {
      quotes: quotesWithDepartment,
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

    // 如果更新了明细，需要根据价格配置重新计算单价和总金额（含税/不含税）
    let totalAmount = quote.totalAmount;
    let totalAmountExclTax = quote.totalAmountExclTax ?? 0;
    let totalTaxAmount = quote.taxAmount ?? 0;
    let processedItems: Array<CreateQuoteItemDto & {
      unitPrice: number;
      amount: number;
      unitPriceExclTax: number;
      amountExclTax: number;
      taxAmount: number;
      taxRate?: number;
    }> = [];

    if (updateQuoteDto.items) {
      // 获取租户价格配置
      const pricingConfig: TenantPricingConfig = await this.tenantService.getPricingConfig(tenantId);

      // 计算每个明细项的单价和金额
      totalAmount = 0;
      totalAmountExclTax = 0;
      totalTaxAmount = 0;
      processedItems = await Promise.all(
        updateQuoteDto.items.map(async (item) => {
          const result = await this.pricingCalculator.calculateItemAmounts(
            {
              unitPrice: item.unitPrice,
              priceComponents: (item as any).priceComponents,
              quantity: item.quantity,
              discount: item.discount,
              taxRate: (item as any).taxRate,
            },
            pricingConfig,
          );

          totalAmount += result.amount;
          totalAmountExclTax += result.amountExclTax;
          totalTaxAmount += result.taxAmount;

          return {
            ...item,
            unitPrice: result.unitPrice,
            amount: result.amount,
            priceComponents: (item as any).priceComponents,
            taxRate: result.taxRate,
            unitPriceExclTax: result.unitPriceExclTax,
            amountExclTax: result.amountExclTax,
            taxAmount: result.taxAmount,
          };
        }),
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新报价明细
      if (updateQuoteDto.items && processedItems.length > 0) {
        // 删除旧的明细
        await queryRunner.manager.delete(QuoteItem, { quoteId: id });

        // 创建新的明细
        const quoteItems = processedItems.map(item =>
          this.quoteItemRepository.create({
            quoteId: id,
            productId: item.productId,
            quantity: item.quantity,
            packagingUnit: item.packagingUnit,
            packagingSpec: item.packagingSpec,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            amount: item.amount,
            taxRate: (item as any).taxRate ?? 0,
            unitPriceExclTax: (item as any).unitPriceExclTax ?? 0,
            amountExclTax: (item as any).amountExclTax ?? 0,
            taxAmount: (item as any).taxAmount ?? 0,
            notes: item.notes,
            priceComponents: (item as any).priceComponents,
            tenantId,
          }),
        );

        await queryRunner.manager.save(quoteItems);
      }

      // 更新报价（排除 items 字段，避免 TypeORM 误处理关联关系）
      const { items, ...quoteUpdateData } = updateQuoteDto;

      const updateFields: any = {
        ...quoteUpdateData,
      };
      if (updateQuoteDto.items) {
        updateFields.totalAmount = totalAmount;
        updateFields.totalAmountExclTax = totalAmountExclTax;
        updateFields.taxAmount = totalTaxAmount;
      }

      // 使用 update 而不是 save，避免触发对 quote.items 关系的额外更新（例如将 quoteId 置为 NULL）
      await queryRunner.manager.update(Quote, { id }, updateFields);

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

  /**
   * 提交审批
   */
  async submitApproval(id: number, templateId: number, submitComment: string, memberId: number, tenantId: number) {
    const quote = await this.findQuoteById(id, memberId, tenantId);

    // 检查状态：允许草稿状态和被驳回状态的报价提交审批
    if (quote.status !== QuoteStatus.DRAFT && quote.status !== QuoteStatus.REJECTED) {
      throw new BadRequestException('只有草稿状态或被驳回状态的报价可以提交审批');
    }

    // 提交审批
    const instance = await this.workflowInstanceService.submitApproval(
      {
        businessType: BusinessType.QUOTE,
        businessId: id,
        templateId,
        submitComment,
      },
      memberId,
      tenantId,
      quote.ownerId,
      quote.departmentId,
    );

    // 更新报价状态
    quote.status = QuoteStatus.PENDING_APPROVAL;
    await this.quoteRepository.save(quote);

    return instance;
  }

  /**
   * 获取报价的审批实例
   */
  async getApprovalInstance(id: number, tenantId: number) {
    return await this.workflowInstanceService.findInstanceByBusiness(BusinessType.QUOTE, id, tenantId);
  }
}

