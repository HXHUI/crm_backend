import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Contract, ContractStatus, ContractType } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Tenant } from '../../entities/tenant.entity';
import { Department } from '../../entities/department.entity';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { getConfigFromObject } from '../../common/utils/tenant-config.util';
import { TenantService, TenantPricingConfig } from '../tenant/tenant.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { BusinessType } from '../../entities/workflow-template.entity';

export interface CreateContractItemDto {
  productId: number;
  quantity: number;
  packagingUnit?: string;  // 包装单位（显示用）
  packagingSpec?: string;   // 包装规格说明（显示用）
  unitPrice: number;
  priceComponents?: Record<string, number>;  // 价格组成项（复杂模式）
  taxRate?: number;
  discount?: number;
  notes?: string;
}

export interface CreateContractDto {
  contractNumber?: string;  // 可选，如果不提供则自动生成
  customerId: number;
  contactId?: number;
  quoteId?: number;
  opportunityId?: number;
  type?: ContractType;
  status?: ContractStatus;
  totalAmount?: number;
  signDate?: Date;
  effectiveDate?: Date;
  expiryDate?: Date;
  content?: string;
  attachments?: string[];
  templateId?: number;
  notes?: string;
  items: CreateContractItemDto[];
}

export interface UpdateContractDto {
  contractNumber?: string;
  customerId?: number;
  contactId?: number;
  quoteId?: number;
  opportunityId?: number;
  type?: ContractType;
  status?: ContractStatus;
  signDate?: Date;
  effectiveDate?: Date;
  expiryDate?: Date;
  content?: string;
  attachments?: string[];
  templateId?: number;
  notes?: string;
  items?: CreateContractItemDto[];
}

export interface QueryContractDto {
  search?: string;
  customerId?: number;
  quoteId?: number;
  opportunityId?: number;
  type?: ContractType;
  status?: ContractStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(ContractItem)
    private readonly contractItemRepository: Repository<ContractItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly dataSource: DataSource,
    private readonly numberGeneratorService: NumberGeneratorService,
    private readonly tenantService: TenantService,
    private readonly pricingCalculator: PricingCalculatorService,
    private readonly workflowInstanceService: WorkflowInstanceService,
  ) {}

  async createContract(createContractDto: CreateContractDto, memberId: number, tenantId: number, departmentId?: number) {
    // 验证客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: createContractDto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 验证联系人是否存在（如果提供）
    if (createContractDto.contactId) {
      const contact = await this.contactRepository.findOne({
        where: { id: createContractDto.contactId, customerId: createContractDto.customerId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException('联系人不存在或不属于该客户');
      }
    }

    // 验证报价是否存在（如果提供）
    if (createContractDto.quoteId) {
      const quote = await this.quoteRepository.findOne({
        where: { id: createContractDto.quoteId, tenantId },
      });
      if (!quote) {
        throw new NotFoundException('报价不存在');
      }
    }

    // 验证商机是否存在（如果提供）
    if (createContractDto.opportunityId) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: createContractDto.opportunityId, tenantId },
      });
      if (!opportunity) {
        throw new NotFoundException('商机不存在');
      }
    }

    // 获取租户价格配置
    const pricingConfig: TenantPricingConfig = await this.tenantService.getPricingConfig(tenantId);

    // 计算每个明细项的单价和金额，并计算总金额（含税/不含税）
    let totalAmount = 0;
    let totalAmountExclTax = 0;
    let totalTaxAmount = 0;
    const processedItems = await Promise.all(
      createContractDto.items.map(async (item) => {
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
          priceComponents: result.priceComponents,
          taxRate: result.taxRate,
          unitPriceExclTax: result.unitPriceExclTax,
          amountExclTax: result.amountExclTax,
          taxAmount: result.taxAmount,
        };
      }),
    );

    // 如果没有提供单号，则自动生成
    const contractNumber = createContractDto.contractNumber || await this.numberGeneratorService.generateContractNumber(tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建合同
      const contract = this.contractRepository.create({
        contractNumber,
        customerId: createContractDto.customerId,
        contactId: createContractDto.contactId,
        quoteId: createContractDto.quoteId,
        opportunityId: createContractDto.opportunityId,
        type: createContractDto.type || ContractType.SALES,
        status: createContractDto.status || ContractStatus.DRAFT,
        totalAmount,
        totalAmountExclTax,
        taxAmount: totalTaxAmount,
        signDate: createContractDto.signDate,
        effectiveDate: createContractDto.effectiveDate,
        expiryDate: createContractDto.expiryDate,
        content: createContractDto.content,
        attachments: createContractDto.attachments || [],
        templateId: createContractDto.templateId,
        notes: createContractDto.notes,
        ownerId: memberId,
        tenantId,
        departmentId,
        createdBy: memberId,
      });

      const savedContract = await queryRunner.manager.save(contract);

      // 创建合同明细（使用已计算好的单价、金额、税额和价格组成项）
      const contractItems = processedItems.map(item =>
        this.contractItemRepository.create({
          contractId: savedContract.id,
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

      await queryRunner.manager.save(contractItems);

      await queryRunner.commitTransaction();

      // 返回完整的合同信息
      return await this.contractRepository.findOne({
        where: { id: savedContract.id },
        relations: ['customer', 'contact', 'quote', 'opportunity', 'items', 'items.product'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllContracts(query: QueryContractDto, memberId: number, tenantId: number) {
    const { search, customerId, quoteId, opportunityId, type, status, page = 1, limit = 50 } = query;

    const queryBuilder = this.contractRepository.createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.contact', 'contact')
      .leftJoinAndSelect('contract.quote', 'quote')
      .leftJoinAndSelect('contract.opportunity', 'opportunity')
      .leftJoinAndSelect('contract.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .leftJoinAndSelect('contract.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'creatorUser')
      .where('contract.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(contract.contractNumber LIKE :search OR customer.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 客户筛选
    if (customerId) {
      queryBuilder.andWhere('contract.customerId = :customerId', { customerId });
    }

    // 报价筛选
    if (quoteId) {
      queryBuilder.andWhere('contract.quoteId = :quoteId', { quoteId });
    }

    // 商机筛选
    if (opportunityId) {
      queryBuilder.andWhere('contract.opportunityId = :opportunityId', { opportunityId });
    }

    // 类型筛选
    if (type) {
      queryBuilder.andWhere('contract.type = :type', { type });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('contract.status = :status', { status });
    }

    // 排序和分页
    queryBuilder
      .orderBy('contract.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [contracts, total] = await queryBuilder.getManyAndCount();

    // 批量查询部门信息
    const departmentIds = [...new Set(contracts.map(c => c.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.dataSource.getRepository(Department).find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 统一序列化 owner 字段，返回 username（优先昵称，其次系统用户名）
    const serialized = contracts.map((contract) => {
      const contractDepartmentId = contract.departmentId ? Number(contract.departmentId) : null;
      return {
        ...contract,
        department: contractDepartmentId && departmentsMap.has(contractDepartmentId)
          ? { id: departmentsMap.get(contractDepartmentId)!.id, name: departmentsMap.get(contractDepartmentId)!.name }
          : null,
        owner: contract.owner
          ? {
              id: contract.owner.id,
              username: contract.owner.nickname || (contract.owner as any).user?.username || null,
            }
          : null,
      };
    });

    return {
      contracts: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findContractById(id: number, memberId: number, tenantId: number) {
    // 验证参数
    if (!id || isNaN(id) || !tenantId || isNaN(tenantId)) {
      throw new NotFoundException('合同不存在');
    }

    const contract = await this.contractRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'contact', 'quote', 'opportunity', 'items', 'items.product', 'owner'],
    });

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    return contract;
  }

  async updateContract(id: number, updateContractDto: UpdateContractDto, memberId: number, tenantId: number) {
    const contract = await this.findContractById(id, memberId, tenantId);

    // 验证联系人（如果更新了客户或联系人）
    const customerId = updateContractDto.customerId || contract.customerId;
    if (updateContractDto.contactId) {
      const contact = await this.contactRepository.findOne({
        where: { id: updateContractDto.contactId, customerId, tenantId },
      });
      if (!contact) {
        throw new NotFoundException('联系人不存在或不属于该客户');
      }
    } else if (updateContractDto.customerId && contract.contactId) {
      // 如果更新了客户，但原合同有联系人，需要清除联系人（因为联系人属于原客户）
      updateContractDto.contactId = undefined;
    }

    // 如果更新了明细，需要根据价格配置重新计算单价和总金额（含税/不含税）
    let totalAmount = contract.totalAmount;
    let totalAmountExclTax = contract.totalAmountExclTax ?? 0;
    let totalTaxAmount = contract.taxAmount ?? 0;
    let processedItems: Array<CreateContractItemDto & {
      unitPrice: number;
      amount: number;
      unitPriceExclTax: number;
      amountExclTax: number;
      taxAmount: number;
      taxRate?: number;
    }> = [];

    if (updateContractDto.items) {
      // 获取租户价格配置
      const pricingConfig: TenantPricingConfig = await this.tenantService.getPricingConfig(tenantId);

      // 计算每个明细项的单价和金额
      totalAmount = 0;
      totalAmountExclTax = 0;
      totalTaxAmount = 0;
      processedItems = await Promise.all(
        updateContractDto.items.map(async (item) => {
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
      // 更新合同明细
      if (updateContractDto.items && processedItems.length > 0) {
        // 先删除所有旧的明细项（使用硬删除，确保完全删除）
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(ContractItem)
          .where('contractId = :contractId', { contractId: id })
          .andWhere('tenantId = :tenantId', { tenantId })
          .execute();

        // 创建新的明细（确保不包含 id 字段，避免 TypeORM 误认为是更新操作）
        const contractItems = processedItems.map(item =>
          this.contractItemRepository.create({
            contractId: id,
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

        if (contractItems.length > 0) {
          await queryRunner.manager.save(contractItems);
        }
      }

      // 更新合同（排除 items 字段，避免 TypeORM 误处理关联关系）
      const { items, ...updateData } = updateContractDto;
      
      // 准备更新数据
      const updateFields: any = { ...updateData };
      if (updateContractDto.items) {
        updateFields.totalAmount = totalAmount;
        updateFields.totalAmountExclTax = totalAmountExclTax;
        updateFields.taxAmount = totalTaxAmount;
      }
      
      // 使用 update 方法而不是 save，避免处理关联关系（特别是 items）
      await queryRunner.manager.update(Contract, { id }, updateFields);

      await queryRunner.commitTransaction();

      return await this.findContractById(id, memberId, tenantId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteContract(id: number, memberId: number, tenantId: number) {
    const contract = await this.findContractById(id, memberId, tenantId);
    await this.contractRepository.softDelete(id);
    return contract;
  }

  /**
   * 提交审批
   */
  async submitApproval(id: number, templateId: number, submitComment: string, memberId: number, tenantId: number) {
    const contract = await this.findContractById(id, memberId, tenantId);

    // 检查状态：允许草稿状态和被驳回状态的合同提交审批
    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.REJECTED) {
      throw new BadRequestException('只有草稿状态或被驳回状态的合同可以提交审批');
    }

    try {
      // 提交审批
      const instance = await this.workflowInstanceService.submitApproval(
        {
          businessType: BusinessType.CONTRACT,
          businessId: id,
          templateId,
          submitComment,
        },
        memberId,
        tenantId,
        contract.ownerId,
        contract.departmentId,
      );

      // 如果有工作流，状态为审批中
      contract.status = ContractStatus.PENDING_APPROVAL;
      await this.contractRepository.save(contract);

      return instance;
    } catch (error) {
      // 如果没有工作流（找不到审批人），直接设置为已生效
      if (error instanceof BadRequestException && error.message.includes('无法找到审批人')) {
        contract.status = ContractStatus.ACTIVE;
        await this.contractRepository.save(contract);
        return null; // 没有工作流实例
      }
      throw error;
    }
  }

  /**
   * 获取合同的审批实例
   */
  async getApprovalInstance(id: number, tenantId: number) {
    return await this.workflowInstanceService.findInstanceByBusiness(BusinessType.CONTRACT, id, tenantId);
  }

  async createContractFromQuote(quoteId: number, memberId: number, tenantId: number, departmentId?: number) {
    // 获取报价信息
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, tenantId },
      relations: ['items', 'items.product', 'customer', 'contact', 'opportunity'],
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    // 自动生成合同编号
    const contractNumber = await this.numberGeneratorService.generateContractNumber(tenantId);

    // 从报价明细创建合同明细（保留价格组成项、包装单位信息）
    const contractItems = quote.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      packagingUnit: item.packagingUnit,
      packagingSpec: item.packagingSpec,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      notes: item.notes,
      priceComponents: (item as any).priceComponents,
      taxRate: (item as any).taxRate,
    }));

    // 创建合同
    const createContractDto: CreateContractDto = {
      contractNumber,
      customerId: quote.customerId,
      contactId: quote.contactId,
      quoteId: quote.id,
      opportunityId: quote.opportunityId,
      type: ContractType.SALES,
      status: ContractStatus.DRAFT,
      effectiveDate: new Date(),
      items: contractItems,
    };

    return await this.createContract(createContractDto, memberId, tenantId, departmentId);
  }

  /**
   * 获取即将到期的合同列表
   * @param tenantId 租户ID
   * @param days 提前提醒天数（可选，如果不提供则从租户配置读取）
   * @returns 即将到期的合同列表，包含剩余天数
   */
  async getExpiringContracts(tenantId: number, days?: number) {
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
    const reminderDays = days ?? config.contractExpiryReminderDays;

    // 计算日期范围：今天到未来N天
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + reminderDays);
    endDate.setHours(23, 59, 59, 999);

    // 查询即将到期的合同
    // 只查询状态为 active 或 signed 的合同
    const contracts = await this.contractRepository.find({
      where: {
        tenantId,
        expiryDate: MoreThanOrEqual(today),
        status: In([ContractStatus.ACTIVE, ContractStatus.SIGNED]),
      },
      relations: ['customer', 'contact', 'owner', 'owner.user'],
      order: {
        expiryDate: 'ASC',
      },
    });

    // 过滤出在提醒范围内的合同，并计算剩余天数
    const now = new Date();
    const expiringContracts = contracts
      .filter(contract => {
        if (!contract.expiryDate) return false;
        const expiryDate = new Date(contract.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);
        return expiryDate >= today && expiryDate <= endDate;
      })
      .map(contract => {
        const expiryDate = new Date(contract.expiryDate!);
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          ...contract,
          daysRemaining: diffDays,
        };
      });

    return expiringContracts;
  }
}

