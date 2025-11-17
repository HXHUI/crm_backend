import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Contract, ContractStatus, ContractType } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Contact } from '../../entities/contact.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Opportunity } from '../../entities/opportunity.entity';

export interface CreateContractItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  notes?: string;
}

export interface CreateContractDto {
  contractNumber: string;
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
    private readonly dataSource: DataSource,
  ) {}

  async createContract(createContractDto: CreateContractDto, memberId: number, tenantId: number) {
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

    // 计算总金额（基于明细项）
    const totalAmount = createContractDto.items.reduce((sum, item) => {
      const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      return sum + amount;
    }, 0);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建合同
      const contract = this.contractRepository.create({
        contractNumber: createContractDto.contractNumber,
        customerId: createContractDto.customerId,
        contactId: createContractDto.contactId,
        quoteId: createContractDto.quoteId,
        opportunityId: createContractDto.opportunityId,
        type: createContractDto.type || ContractType.SALES,
        status: createContractDto.status || ContractStatus.DRAFT,
        totalAmount,
        signDate: createContractDto.signDate,
        effectiveDate: createContractDto.effectiveDate,
        expiryDate: createContractDto.expiryDate,
        content: createContractDto.content,
        attachments: createContractDto.attachments || [],
        templateId: createContractDto.templateId,
        notes: createContractDto.notes,
        ownerId: memberId,
        tenantId,
      });

      const savedContract = await queryRunner.manager.save(contract);

      // 创建合同明细
      const contractItems = createContractDto.items.map(item => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return this.contractItemRepository.create({
          contractId: savedContract.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          amount,
          notes: item.notes,
          tenantId,
        });
      });

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
    const { search, customerId, quoteId, opportunityId, type, status, page = 1, limit = 10 } = query;

    const queryBuilder = this.contractRepository.createQueryBuilder('contract')
      .leftJoinAndSelect('contract.customer', 'customer')
      .leftJoinAndSelect('contract.contact', 'contact')
      .leftJoinAndSelect('contract.quote', 'quote')
      .leftJoinAndSelect('contract.opportunity', 'opportunity')
      .leftJoinAndSelect('contract.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
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

    return {
      contracts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findContractById(id: number, memberId: number, tenantId: number) {
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

    // 如果更新了明细，需要重新计算总金额
    let totalAmount = contract.totalAmount;
    if (updateContractDto.items) {
      totalAmount = updateContractDto.items.reduce((sum, item) => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return sum + amount;
      }, 0);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新合同明细
      if (updateContractDto.items) {
        // 删除旧的明细
        await queryRunner.manager.delete(ContractItem, { contractId: id });

        // 创建新的明细
        const contractItems = updateContractDto.items.map(item => {
          const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
          return this.contractItemRepository.create({
            contractId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            amount,
            notes: item.notes,
            tenantId,
          });
        });

        await queryRunner.manager.save(contractItems);
      }

      // 更新合同
      Object.assign(contract, updateContractDto);
      if (updateContractDto.items) {
        contract.totalAmount = totalAmount;
      }
      await queryRunner.manager.save(contract);

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

  async createContractFromQuote(quoteId: number, memberId: number, tenantId: number) {
    // 获取报价信息
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, tenantId },
      relations: ['items', 'items.product', 'customer', 'contact', 'opportunity'],
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    // 生成合同编号（可以根据实际需求调整）
    const contractNumber = `CONTRACT-${Date.now()}`;

    // 从报价明细创建合同明细
    const contractItems = quote.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      notes: item.notes,
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

    return await this.createContract(createContractDto, memberId, tenantId);
  }
}

