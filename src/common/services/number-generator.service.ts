import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote } from '../../entities/quote.entity';
import { Contract } from '../../entities/contract.entity';
import { Order } from '../../entities/order.entity';

export enum NumberType {
  QUOTE = 'QUOTE',      // 报价单号：BJ+年月日+4位流水号
  CONTRACT = 'CONTRACT', // 合同单号：HT+年月日+4位流水号
  ORDER = 'ORDER',      // 订单单号：DD+年月日+4位流水号
}

@Injectable()
export class NumberGeneratorService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * 生成报价单号：BJ+年月日+4位流水号
   * 例如：BJ202412010001
   */
  async generateQuoteNumber(tenantId: number): Promise<string> {
    console.log('NumberGeneratorService.generateQuoteNumber 被调用, tenantId:', tenantId);
    const number = await this.generateNumber(NumberType.QUOTE, tenantId);
    console.log('NumberGeneratorService.generateQuoteNumber 生成结果:', number);
    return number;
  }

  /**
   * 生成合同单号：HT+年月日+4位流水号
   * 例如：HT202412010001
   */
  async generateContractNumber(tenantId: number): Promise<string> {
    return this.generateNumber(NumberType.CONTRACT, tenantId);
  }

  /**
   * 生成订单单号：DD+年月日+4位流水号
   * 例如：DD202412010001
   */
  async generateOrderNumber(tenantId: number): Promise<string> {
    return this.generateNumber(NumberType.ORDER, tenantId);
  }

  /**
   * 通用单号生成方法
   */
  private async generateNumber(type: NumberType, tenantId: number): Promise<string> {
    console.log('generateNumber 开始, type:', type, 'tenantId:', tenantId);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    console.log('生成的日期字符串:', dateStr);

    // 根据类型确定前缀
    let prefix: string;
    let fieldName: string;

    switch (type) {
      case NumberType.QUOTE:
        prefix = 'BJ';
        fieldName = 'quoteNumber';
        break;
      case NumberType.CONTRACT:
        prefix = 'HT';
        fieldName = 'contractNumber';
        break;
      case NumberType.ORDER:
        prefix = 'DD';
        fieldName = 'orderNumber';
        break;
      default:
        throw new Error(`未知的单号类型: ${type}`);
    }

    // 查询当天已有的最大流水号
    const pattern = `${prefix}${dateStr}%`;
    let lastEntity: Quote | Contract | Order | null = null;

    if (type === NumberType.QUOTE) {
      lastEntity = await this.quoteRepository
        .createQueryBuilder('quote')
        .where('quote.quoteNumber LIKE :pattern', { pattern })
        .andWhere('quote.tenantId = :tenantId', { tenantId })
        .orderBy('quote.quoteNumber', 'DESC')
        .limit(1)
        .getOne();
    } else if (type === NumberType.CONTRACT) {
      lastEntity = await this.contractRepository
        .createQueryBuilder('contract')
        .where('contract.contractNumber LIKE :pattern', { pattern })
        .andWhere('contract.tenantId = :tenantId', { tenantId })
        .orderBy('contract.contractNumber', 'DESC')
        .limit(1)
        .getOne();
    } else if (type === NumberType.ORDER) {
      lastEntity = await this.orderRepository
        .createQueryBuilder('order')
        .where('order.orderNumber LIKE :pattern', { pattern })
        .andWhere('order.tenantId = :tenantId', { tenantId })
        .orderBy('order.orderNumber', 'DESC')
        .limit(1)
        .getOne();
    }

    let sequence = 1;
    if (lastEntity) {
      const lastNumber = (lastEntity as any)[fieldName];
      const lastSequence = parseInt(lastNumber.slice(-4), 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    // 生成4位流水号
    const sequenceStr = String(sequence).padStart(4, '0');
    console.log('生成的流水号:', sequenceStr);

    // 如果流水号超过9999，抛出错误
    if (sequence > 9999) {
      throw new Error(`当日${prefix}单号已超过最大数量限制（9999）`);
    }

    const finalNumber = `${prefix}${dateStr}${sequenceStr}`;
    console.log('最终生成的单号:', finalNumber);
    return finalNumber;
  }
}

