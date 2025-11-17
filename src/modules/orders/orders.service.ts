import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Customer } from '../../entities/customer.entity';
import { Opportunity } from '../../entities/opportunity.entity';
import { Quote } from '../../entities/quote.entity';
import { QuoteItem } from '../../entities/quote-item.entity';
import { Contract } from '../../entities/contract.entity';
import { ContractItem } from '../../entities/contract-item.entity';

export interface CreateOrderItemDto {
  productId: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  notes?: string;
}

export interface CreateOrderDto {
  orderNumber: string;
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
  ) {}

  async createOrder(createOrderDto: CreateOrderDto, memberId: number, tenantId: number) {
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

    // 计算总金额
    const totalAmount = createOrderDto.items.reduce((sum, item) => {
      const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      return sum + amount;
    }, 0);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 创建订单
      const order = this.orderRepository.create({
        orderNumber: createOrderDto.orderNumber,
        customerId: createOrderDto.customerId,
        quoteId: createOrderDto.quoteId,
        contractId: createOrderDto.contractId,
        opportunityId: createOrderDto.opportunityId,
        orderDate: createOrderDto.orderDate,
        deliveryDate: createOrderDto.deliveryDate,
        status: createOrderDto.status || OrderStatus.PENDING,
        notes: createOrderDto.notes,
        totalAmount,
        ownerId: memberId,
        tenantId,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 创建订单明细
      const orderItems = createOrderDto.items.map(item => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          amount,
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

  async createOrderFromQuote(quoteId: number, memberId: number, tenantId: number) {
    // 获取报价信息
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, tenantId },
      relations: ['items', 'items.product', 'customer', 'opportunity'],
    });

    if (!quote) {
      throw new NotFoundException('报价不存在');
    }

    // 生成订单编号（可以根据实际需求调整）
    const orderNumber = `ORD-${Date.now()}`;

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
      status: OrderStatus.PENDING,
      items: orderItems,
    };

    return await this.createOrder(createOrderDto, memberId, tenantId);
  }

  async createOrderFromContract(contractId: number, memberId: number, tenantId: number) {
    // 获取合同信息
    const contract = await this.contractRepository.findOne({
      where: { id: contractId, tenantId },
      relations: ['items', 'items.product', 'customer', 'opportunity'],
    });

    if (!contract) {
      throw new NotFoundException('合同不存在');
    }

    // 生成订单编号（可以根据实际需求调整）
    const orderNumber = `ORD-${Date.now()}`;

    // 从合同明细创建订单明细
    const orderItems = contract.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      notes: item.notes,
    }));

    // 创建订单
    const createOrderDto: CreateOrderDto = {
      orderNumber,
      customerId: contract.customerId,
      contractId: contract.id,
      opportunityId: contract.opportunityId,
      orderDate: new Date(),
      status: OrderStatus.PENDING,
      items: orderItems,
    };

    return await this.createOrder(createOrderDto, memberId, tenantId);
  }

  async findAllOrders(query: QueryOrderDto, memberId: number, tenantId: number) {
    const { search, customerId, quoteId, opportunityId, status, page = 1, limit = 10 } = query;

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.quote', 'quote')
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

    return {
      orders,
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

    // 如果更新了明细，需要重新计算总金额
    let totalAmount = order.totalAmount;
    if (updateOrderDto.items) {
      totalAmount = updateOrderDto.items.reduce((sum, item) => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
        return sum + amount;
      }, 0);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新订单明细
      if (updateOrderDto.items) {
        // 删除旧的明细
        await queryRunner.manager.delete(OrderItem, { orderId: id });

        // 创建新的明细
        const orderItems = updateOrderDto.items.map(item => {
          const amount = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
          return this.orderItemRepository.create({
            orderId: id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            amount,
            notes: item.notes,
            tenantId,
          });
        });

        await queryRunner.manager.save(orderItems);
      }

      // 更新订单
      Object.assign(order, updateOrderDto);
      if (updateOrderDto.items) {
        order.totalAmount = totalAmount;
      }
      await queryRunner.manager.save(order);

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
}

