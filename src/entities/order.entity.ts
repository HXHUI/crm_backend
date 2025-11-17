import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { Opportunity } from './opportunity.entity';
import { Quote } from './quote.entity';
import { Contract } from './contract.entity';
import { Member } from './member.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',         // 待处理
  CONFIRMED = 'confirmed',     // 已确认
  PROCESSING = 'processing',   // 处理中
  SHIPPED = 'shipped',         // 已发货
  DELIVERED = 'delivered',     // 已交付
  COMPLETED = 'completed',     // 已完成
  CANCELLED = 'cancelled',     // 已取消
}

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ name: 'order_number', comment: '订单编号' })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'quote_id', type: 'bigint', nullable: true, comment: '报价ID' })
  quoteId?: number;

  @ManyToOne(() => Quote, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote?: Quote;

  @Column({ name: 'contract_id', type: 'bigint', nullable: true, comment: '合同ID' })
  contractId?: number;

  @ManyToOne(() => Contract, { nullable: true })
  @JoinColumn({ name: 'contract_id' })
  contract?: Contract;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, comment: '商机ID' })
  opportunityId?: number;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity?: Opportunity;

  @Column({ name: 'order_date', type: 'date', comment: '下单日期' })
  orderDate: Date;

  @Column({ name: 'delivery_date', type: 'date', nullable: true, comment: '交付日期' })
  deliveryDate?: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '订单金额' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
    comment: '订单状态',
  })
  status: OrderStatus;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  @Column({ name: 'ownerId', type: 'bigint', nullable: true, comment: '负责人ID' })
  ownerId?: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'ownerId' })
  owner?: Member;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

