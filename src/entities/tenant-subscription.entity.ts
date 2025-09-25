import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { SubscriptionPlan } from './subscription-plan.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TRIAL = 'trial',
}

@Entity('tenant_subscriptions')
export class TenantSubscription extends BaseEntity {
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    comment: '订阅状态',
  })
  status: SubscriptionStatus;

  @Column({ type: 'datetime', comment: '开始时间' })
  startDate: Date;

  @Column({ type: 'datetime', comment: '结束时间' })
  endDate: Date;

  @Column({ type: 'datetime', nullable: true, comment: '试用结束时间' })
  trialEndDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '订阅价格' })
  price: number;

  @Column({ type: 'boolean', default: true, comment: '自动续费' })
  autoRenew: boolean;

  @Column({ nullable: true, comment: '支付方式' })
  paymentMethod?: string;

  @Column({ nullable: true, comment: '支付ID' })
  paymentId?: string;

  @Column({ type: 'json', nullable: true, comment: '订阅配置' })
  config?: Record<string, any>;

  // 关联关系
  @Column({ comment: '租户ID' })
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ comment: '套餐ID' })
  planId: string;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'planId' })
  plan: SubscriptionPlan;
}
