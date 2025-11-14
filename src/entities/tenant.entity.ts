import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Member } from './member.entity';
import { TenantSubscription } from './tenant-subscription.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column({ comment: '租户名称' })
  name: string;

  @Column({ nullable: true, comment: '租户描述' })
  description?: string;

  @Column({ nullable: true, comment: '租户Logo URL' })
  logo?: string;


  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
    comment: '租户状态',
  })
  status: TenantStatus;

  @Column({ type: 'json', nullable: true, comment: '租户配置' })
  config?: Record<string, any>;

  // 关联关系
  @Column({ name: 'owner_id', type: 'bigint', comment: '租户所有者ID' })
  ownerId: number;

  @ManyToOne(() => User, (user) => user.ownedTenants)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => Member, (member) => member.tenant)
  members: Member[];

  @OneToMany(() => TenantSubscription, (subscription) => subscription.tenant)
  subscriptions: TenantSubscription[];
}
