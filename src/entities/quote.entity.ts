import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';
import { Member } from './member.entity';
import { QuoteItem } from './quote-item.entity';

export enum QuoteStatus {
  DRAFT = 'draft',           // 草稿
  PENDING_APPROVAL = 'pending_approval', // 审批中
  APPROVED = 'approved',     // 已审批通过
  ACTIVE = 'active',         // 已生效
  REJECTED = 'rejected',     // 已拒绝（审批拒绝）
  SENT = 'sent',             // 已发送
  ACCEPTED = 'accepted',     // 已接受
  EXPIRED = 'expired',       // 已过期
}

@Entity('quotes')
export class Quote extends BaseEntity {
  @Column({ name: 'quote_number', comment: '报价单号' })
  quoteNumber: string;

  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'contact_id', type: 'bigint', nullable: true, comment: '联系人ID' })
  contactId?: number;

  @ManyToOne(() => Contact, { nullable: true })
  @JoinColumn({ name: 'contact_id' })
  contact?: Contact;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, comment: '商机ID' })
  opportunityId?: number;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity?: Opportunity;

  @Column({ name: 'quote_date', type: 'date', comment: '报价日期' })
  quoteDate: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true, comment: '有效期' })
  expiryDate?: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '总金额' })
  totalAmount: number;

  @Column({
    name: 'total_amount_excl_tax',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '不含税总金额',
  })
  totalAmountExclTax: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '税金合计',
  })
  taxAmount: number;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT,
    comment: '报价状态',
  })
  status: QuoteStatus;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  @Column({ name: 'ownerId', type: 'bigint', nullable: true, comment: '负责人ID' })
  ownerId?: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'ownerId' })
  owner?: Member;

  @OneToMany(() => QuoteItem, (quoteItem) => quoteItem.quote)
  items: QuoteItem[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({ name: 'department_id', type: 'bigint', nullable: true, comment: '部门ID' })
  departmentId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}

