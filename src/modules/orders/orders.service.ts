import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order, OrderStatus } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Contract } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';
import { Department } from '../../entities/department.entity';
import { NumberGeneratorService } from '../../common/services/number-generator.service';
import { TenantService, TenantPricingConfig } from '../tenant/tenant.service';
import { PricingCalculatorService } from '../../common/services/pricing-calculator.service';
import { WorkflowInstanceService } from '../workflow/workflow-instance.service';
import { BusinessType } from '../../entities/workflow-template.entity';

export interface CreateOrderItemDto {
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

export interface CreateOrderDto {
  orderNumber?: string;  // 可选，如果不提供则自动生成
  customerId: number;
  quoteId?: number;
  contractId?: number;
  opportunityId?: number;
  orderDate: Date;
  deliveryDate?: Date;
  status?: OrderStatus;
  notes?: string;
  items: CreateOrderItemDto[];
}

export interface UpdateOrderDto {
  orderNumber?: string;
  customerId?: number;
  quoteId?: number;
  contractId?: number;
  opportunityId?: number;
  orderDate?: Date;
  deliveryDate?: Date;
  status?: OrderStatus;
  notes?: string;
  items?: CreateOrderItemDto[];
}

export interface QueryOrderDto {
  search?: string;
  customerId?: number;
  quoteId?: number;
  opportunityId?: number;
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteItem)
    private readonly quoteItemRepository: Repository<QuoteItem>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(ContractItem)
    private readonly contractItemRepository: Repository<ContractItem>,
    private readonly dataSource: DataSource,
    private readonly numberGeneratorService: NumberGeneratorService,
    private readonly tenantService: TenantService,
    private readonly pricingCalculator: PricingCalculatorService,
    private readonly workflowInstanceService: WorkflowInstanceService,
  ) {}

  // 订单沿用统一的价格计算服务（PricingCalculatorService）

  async createOrder(createOrderDto: CreateOrderDto, memberId: number, tenantId: number, departmentId?: number) {
    // 验证客户是否存在
    const customer = await this.customerRepository.findOne({
      where: { id: createOrderDto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 验证报价是否存在（如果提供）
    if (createOrderDto.quoteId) {
      const quote = await this.quoteRepository.findOne({
        where: { id: createOrderDto.quoteId, tenantId },
      });
      if (!quote) {
        throw new NotFoundException('报价不存在');
      }
    }

    // 验证合同是否存在（如果提供）
    if (createOrderDto.contractId) {
      const contract = await this.contractRepository.findOne({
        where: { id: createOrderDto.contractId, tenantId },
      });
      if (!contract) {
        throw new NotFoundException('合同不存在');
      }
    }

    // 验证商机是否存在（如果提供）
    if (createOrderDto.opportunityId) {
      const opportunity = await this.opportunityRepository.findOne({
        where: { id: createOrderDto.opportunityId, tenantId },
      });
      if (!opportunity) {
        throw new NotFoundException('商机不存在');
      }
    }

    // 获取租户价格配置
    const pricingConfig = await this.tenantService.getPricingConfig(tenantId);

    // 计算每个明细项的单价和总金额（含税/不含税）
    let totalAmount = 0;
    let totalAmountExclTax = 0;
    let totalTaxAmount = 0;
    const processedItems = await Promise.all(
      createOrderDto.items.map(async (item) => {
        const result = await this.pricingCalculator.calculateItemAmounts(
          {
            unitPrice: item.unitPrice,
            priceComponents: item.priceComponents,
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
    const orderNumber = createOrderDto.orderNumber || await this.numberGeneratorService.generateOrderNumber(tenantId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建订单
      const order = this.orderRepository.create({
        orderNumber,
        customerId: createOrderDto.customerId,
        quoteId: createOrderDto.quoteId,
        contractId: createOrderDto.contractId,
        opportunityId: createOrderDto.opportunityId,
        orderDate: createOrderDto.orderDate,
        deliveryDate: createOrderDto.deliveryDate,
        status: createOrderDto.status || OrderStatus.DRAFT,
        notes: createOrderDto.notes,
        totalAmount,
        totalAmountExclTax,
        taxAmount: totalTaxAmount,
        ownerId: memberId,
        tenantId,
        departmentId,
        createdBy: memberId,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 创建订单明细
      const orderItems = processedItems.map(item => {
        return this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          packagingUnit: item.packagingUnit,
          packagingSpec: item.packagingSpec,
          unitPrice: item.unitPrice,
          priceComponents: item.priceComponents,
          discount: item.discount || 0,
          amount: item.amount,
          taxRate: (item as any).taxRate ?? 0,
          unitPriceExclTax: (item as any).unitPriceExclTax ?? 0,
          amountExclTax: (item as any).amountExclTax ?? 0,
          taxAmount: (item as any).taxAmount ?? 0,
          notes: item.notes,
          tenantId,
        });
      });

      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();

      // 返回完整的订单信息
      return await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'quote', 'opportunity', 'items', 'items.product'],
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createOrderFromQuote(quoteId: number, memberId: number, tenantId: number, departmentId?: number) {
    // 获取报价信息
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, tenantId },
      relations: ['items', 'items.product', 'customer', 'opportunity'],
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    // 自动生成订单编号
    const orderNumber = await this.numberGeneratorService.generateOrderNumber(tenantId);

    // 从报价明细创建订单明细
    const orderItems = quote.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      notes: item.notes,
    }));

    // 创建订单
    const createOrderDto: CreateOrderDto = {
      orderNumber,
      customerId: quote.customerId,
      quoteId: quote.id,
      opportunityId: quote.opportunityId,
      orderDate: new Date(),
      status: OrderStatus.DRAFT,
      items: orderItems,
    };

    return await this.createOrder(createOrderDto, memberId, tenantId, departmentId);
  }

  async createOrderFromContract(contractId: number, memberId: number, tenantId: number, departmentId?: number) {
    // 获取合同信息
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, tenantId },
      relations: ['items', 'items.product', 'customer', 'opportunity'],
    });

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    // 自动生成订单编号
    const orderNumber = await this.numberGeneratorService.generateOrderNumber(tenantId);

    // 从合同明细创建订单明细（继承包装单位信息）
    const orderItems = contract.items.map(item => ({
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

    // 创建订单
    const createOrderDto: CreateOrderDto = {
      orderNumber,
      customerId: contract.customerId,
      contractId: contract.id,
      opportunityId: contract.opportunityId,
      orderDate: new Date(),
      status: OrderStatus.DRAFT,
      items: orderItems,
    };

    return await this.createOrder(createOrderDto, memberId, tenantId, departmentId);
  }

  async findAllOrders(query: QueryOrderDto, memberId: number, tenantId: number) {
    const { search, customerId, quoteId, opportunityId, status, page = 1, limit = 50 } = query;

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.quote', 'quote')
      .leftJoinAndSelect('order.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'creatorUser')
      .leftJoinAndSelect('order.contract', 'contract')
      .leftJoinAndSelect('order.opportunity', 'opportunity')
      .leftJoinAndSelect('order.owner', 'owner')
      .leftJoinAndSelect('owner.user', 'ownerUser')
      .where('order.tenantId = :tenantId', { tenantId });

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR customer.name LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // 客户筛选
    if (customerId) {
      queryBuilder.andWhere('order.customerId = :customerId', { customerId });
    }

    // 报价筛选
    if (quoteId) {
      queryBuilder.andWhere('order.quoteId = :quoteId', { quoteId });
    }

    // 商机筛选
    if (opportunityId) {
      queryBuilder.andWhere('order.opportunityId = :opportunityId', { opportunityId });
    }

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // 排序和分页
    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    // 批量查询部门信息
    const departmentIds = [...new Set(orders.map(o => o.departmentId).filter(id => id != null && id !== undefined))];
    const departmentsMap = new Map<number, Department>();
    if (departmentIds.length > 0) {
      const departments = await this.dataSource.getRepository(Department).find({
        where: { id: In(departmentIds), tenantId },
      });
      departments.forEach(dept => departmentsMap.set(Number(dept.id), dept));
    }

    // 添加部门信息到返回数据
    const ordersWithDepartment = orders.map(o => {
      const orderDepartmentId = o.departmentId ? Number(o.departmentId) : null;
      return {
        ...o,
        department: orderDepartmentId && departmentsMap.has(orderDepartmentId)
          ? { id: departmentsMap.get(orderDepartmentId)!.id, name: departmentsMap.get(orderDepartmentId)!.name }
          : null,
      };
    });

    return {
      orders: ordersWithDepartment,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOrderById(id: number, memberId: number, tenantId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'quote', 'contract', 'opportunity', 'items', 'items.product', 'owner'],
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    return order;
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto, memberId: number, tenantId: number) {
    const order = await this.findOrderById(id, memberId, tenantId);

    // 如果更新了明细，需要重新计算总金额（含税/不含税）
    let totalAmount = order.totalAmount;
    let totalAmountExclTax = order.totalAmountExclTax ?? 0;
    let totalTaxAmount = order.taxAmount ?? 0;
    let processedItems: Array<CreateOrderItemDto & {
      unitPrice: number;
      amount: number;
      unitPriceExclTax: number;
      amountExclTax: number;
      taxAmount: number;
      taxRate?: number;
    }> = [];
    
    if (updateOrderDto.items) {
      // 获取租户价格配置
      const pricingConfig = await this.tenantService.getPricingConfig(tenantId);

      // 计算每个明细项的单价和总金额
      totalAmount = 0;
      totalAmountExclTax = 0;
      totalTaxAmount = 0;
      processedItems = await Promise.all(
        updateOrderDto.items.map(async (item) => {
          const result = await this.pricingCalculator.calculateItemAmounts(
            {
              unitPrice: item.unitPrice ?? 0,
              priceComponents: item.priceComponents,
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
            priceComponents: item.priceComponents,
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
      // 更新订单明细
      if (updateOrderDto.items && processedItems.length > 0) {
        // 删除旧的明细
        await queryRunner.manager.delete(OrderItem, { orderId: id });

        // 创建新的明细
        const orderItems = processedItems.map(item => {
          return this.orderItemRepository.create({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            packagingUnit: item.packagingUnit,
            packagingSpec: item.packagingSpec,
            unitPrice: item.unitPrice,
            priceComponents: item.priceComponents,
            discount: item.discount || 0,
            amount: item.amount,
            taxRate: (item as any).taxRate ?? 0,
            unitPriceExclTax: (item as any).unitPriceExclTax ?? 0,
            amountExclTax: (item as any).amountExclTax ?? 0,
            taxAmount: (item as any).taxAmount ?? 0,
            notes: item.notes,
            tenantId,
          });
        });

        await queryRunner.manager.save(orderItems);
      }

      // 更新订单（排除 items，因为它是关联关系，需要单独处理）
      const { items, ...orderUpdateData } = updateOrderDto;
      const updateFields: any = {
        ...orderUpdateData,
      };
      if (updateOrderDto.items) {
        updateFields.totalAmount = totalAmount;
        updateFields.totalAmountExclTax = totalAmountExclTax;
        updateFields.taxAmount = totalTaxAmount;
      }

      // 使用 update 而不是 save，避免 TypeORM 在处理关联关系时把 order_items 的 orderId 置为 NULL
      await queryRunner.manager.update(Order, { id }, updateFields);

      await queryRunner.commitTransaction();

      return await this.findOrderById(id, memberId, tenantId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteOrder(id: number, memberId: number, tenantId: number) {
    const order = await this.findOrderById(id, memberId, tenantId);
    await this.orderRepository.softDelete(id);
  }

  /**
   * 提交审批
   */
  async submitApproval(id: number, templateId: number, submitComment: string, memberId: number, tenantId: number) {
    const order = await this.findOrderById(id, memberId, tenantId);

    // 检查状态：允许草稿状态和被驳回状态的订单提交审批
    if (order.status !== OrderStatus.DRAFT && order.status !== OrderStatus.REJECTED) {
      throw new BadRequestException('只有草稿状态或被驳回状态的订单可以提交审批');
    }

    // 提交审批
    const instance = await this.workflowInstanceService.submitApproval(
      {
        businessType: BusinessType.ORDER,
        businessId: id,
        templateId,
        submitComment,
      },
      memberId,
      tenantId,
      order.ownerId,
      order.departmentId,
    );

    // 更新订单状态
    order.status = OrderStatus.PENDING_APPROVAL;
    await this.orderRepository.save(order);

    return instance;
  }

  /**
   * 获取审批实例
   */
  async getApprovalInstance(id: number, tenantId: number) {
    return await this.workflowInstanceService.findInstanceByBusiness(
      BusinessType.ORDER,
      id,
      tenantId,
    );
  }
}

