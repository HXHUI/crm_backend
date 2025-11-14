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

  @Column({ name: 'start_date', type: 'datetime', comment: '开始时间' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime', comment: '结束时间' })
  endDate: Date;

  @Column({ name: 'trial_end_date', type: 'datetime', nullable: true, comment: '试用结束时间' })
  trialEndDate?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '订阅价格' })
  price: number;

  @Column({ name: 'auto_renew', type: 'boolean', default: true, comment: '自动续费' })
  autoRenew: boolean;

  @Column({ name: 'payment_method', nullable: true, comment: '支付方式' })
  paymentMethod?: string;

  @Column({ name: 'payment_id', nullable: true, comment: '支付ID' })
  paymentId?: string;

  @Column({ type: 'json', nullable: true, comment: '订阅配置' })
  config?: Record<string, any>;

  // 关联关系
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'plan_id', type: 'bigint', comment: '套餐ID' })
  planId: number;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  @JoinColumn({ name: 'plan_id' })
  plan: SubscriptionPlan;
}
