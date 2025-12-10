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

  @Column({
    name: 'default_tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '默认税率(%)',
  })
  defaultTaxRate: number;

  // 集团层级关系
  @Column({ name: 'parent_id', type: 'bigint', nullable: true, comment: '父租户ID（集团层级关系）' })
  parentId?: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Tenant;

  @OneToMany(() => Tenant, (tenant) => tenant.parent)
  children?: Tenant[];

  @Column({ type: 'int', default: 0, comment: '层级深度（0为顶级）' })
  level: number;

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

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（用户ID）' })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: User;
}
