import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';
import { Activity } from './activity.entity';
import { CustomerRequirement } from './customer-requirement.entity';

export enum CustomerStatus {
  LEAD = 'lead',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company',
}

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ comment: '客户名称' })
  name: string;

  @Column({ nullable: true, comment: '客户编码' })
  code?: string;

  @Column({
    type: 'enum',
    enum: CustomerType,
    default: CustomerType.INDIVIDUAL,
    comment: '客户类型',
  })
  type: CustomerType;

  @Column({
    type: 'enum',
    enum: CustomerStatus,
    default: CustomerStatus.LEAD,
    comment: '客户状态',
  })
  status: CustomerStatus;

  @Column({ name: 'company_name', nullable: true, comment: '公司名称' })
  companyName?: string;

  @Column({ nullable: true, comment: '行业（字典key）' })
  industry?: string;

  @Column({ nullable: true, comment: '客户规模' })
  size?: string;

  @Column({ nullable: true, comment: '客户描述' })
  description?: string;

  @Column({ type: 'json', nullable: true, comment: '客户标签' })
  tags?: string[];

  @Column({ name: 'estimated_value', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '预计价值' })
  estimatedValue?: number;

  @Column({ nullable: true, comment: '客户来源' })
  source?: string;

  @Column({ nullable: true, comment: '客户等级' })
  level?: string;

  // 地址字段
  @Column({ nullable: true, comment: '省份' })
  province?: string;

  @Column({ nullable: true, comment: '城市' })
  city?: string;

  @Column({ nullable: true, comment: '区县' })
  district?: string;

  @Column({ name: 'address_detail', nullable: true, comment: '详细地址' })
  addressDetail?: string;

  // 关联关系
  @Column({ name: 'ownerId', type: 'bigint', nullable: true, comment: '所属成员ID' })
  ownerId?: number;

  @ManyToOne(() => Member, (member) => member.customers)
  @JoinColumn({ name: 'ownerId' })
  owner: Member;

  @Column({ name: 'department_id', type: 'bigint', nullable: true, comment: '部门ID' })
  departmentId?: number;

  @OneToMany(() => Contact, (contact) => contact.customer)
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.customer)
  opportunities: Opportunity[];

  @OneToMany(() => CustomerRequirement, (requirement) => requirement.customer)
  requirements: CustomerRequirement[];

  // 活动不再直接关联客户，改为通过 relatedToType/relatedToId 关联
  // 保留占位属性以兼容旧代码（不映射关系）
  // activities?: Activity[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}
