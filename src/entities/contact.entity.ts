import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

export enum ContactType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  DECISION_MAKER = 'decision_maker',
  INFLUENCER = 'influencer',
  USER = 'user',
}

@Entity('contacts')
export class Contact extends BaseEntity {
  @Column({ comment: '联系人姓名' })
  name: string;

  @Column({ nullable: true, comment: '职位' })
  position?: string;

  @Column({ nullable: true, comment: '部门' })
  department?: string;

  @Column({ nullable: true, comment: '邮箱' })
  email?: string;

  @Column({ nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ nullable: true, comment: '座机' })
  telephone?: string;

  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.SECONDARY,
    comment: '联系人类型',
  })
  type: ContactType;

  @Column({ name: 'is_primary', type: 'boolean', default: false, comment: '是否主要联系人' })
  isPrimary: boolean;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  @Column({ name: 'other_contacts', type: 'json', nullable: true, comment: '其他联系方式' })
  otherContacts?: Record<string, string>;

  // 关联关系
  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.contacts)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // 租户ID（冗余，便于隔离与过滤）
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}
