import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TenantSubscription } from './tenant-subscription.entity';

export enum PlanType {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  @Column({ comment: '套餐名称' })
  name: string;

  @Column({ nullable: true, comment: '套餐描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: PlanType,
    comment: '套餐类型',
  })
  type: PlanType;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '价格' })
  price: number;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
    comment: '计费周期',
  })
  billingCycle: BillingCycle;

  @Column({ name: 'user_limit', type: 'int', default: -1, comment: '用户数量限制(-1表示无限制)' })
  userLimit: number;

  @Column({ name: 'storage_limit', type: 'int', default: -1, comment: '存储空间限制(GB, -1表示无限制)' })
  storageLimit: number;

  @Column({ type: 'json', nullable: true, comment: '功能特性' })
  features?: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: '排序' })
  sort: number;

  // 关联关系
  @OneToMany(() => TenantSubscription, (subscription) => subscription.plan)
  subscriptions: TenantSubscription[];
}
