import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { Contact } from './contact.entity';
import { Quote } from './quote.entity';
import { Opportunity } from './opportunity.entity';
import { Member } from './member.entity';
import { ContractItem } from './contract-item.entity';

export enum ContractStatus {
  DRAFT = 'draft',           // 草稿
  PENDING_APPROVAL = 'pending_approval', // 审批中
  APPROVED = 'approved',     // 已审批通过
  REJECTED = 'rejected',     // 已拒绝（审批拒绝）
  PENDING_SIGN = 'pending_sign',  // 待签署
  SIGNED = 'signed',        // 已签署
  ACTIVE = 'active',         // 已生效
  EXPIRED = 'expired',       // 已到期
  TERMINATED = 'terminated', // 已终止
  CANCELLED = 'cancelled',   // 已取消
}

export enum ContractType {
  SALES = 'sales',          // 销售合同
  SERVICE = 'service',      // 服务合同
  MAINTENANCE = 'maintenance', // 维护合同
  OTHER = 'other',          // 其他
}

@Entity('contracts')
export class Contract extends BaseEntity {
  @Column({ name: 'contract_number', comment: '合同编号' })
  contractNumber: string;

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

  @Column({ name: 'quote_id', type: 'bigint', nullable: true, comment: '报价ID' })
  quoteId?: number;

  @ManyToOne(() => Quote, { nullable: true })
  @JoinColumn({ name: 'quote_id' })
  quote?: Quote;

  @Column({ name: 'opportunity_id', type: 'bigint', nullable: true, comment: '商机ID' })
  opportunityId?: number;

  @ManyToOne(() => Opportunity, { nullable: true })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity?: Opportunity;

  @Column({
    type: 'enum',
    enum: ContractType,
    default: ContractType.SALES,
    comment: '合同类型',
  })
  type: ContractType;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
    comment: '合同状态',
  })
  status: ContractStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '合同金额' })
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

  @Column({ name: 'sign_date', type: 'date', nullable: true, comment: '签署日期' })
  signDate?: Date;

  @Column({ name: 'effective_date', type: 'date', nullable: true, comment: '生效日期' })
  effectiveDate?: Date;

  @Column({ name: 'expiry_date', type: 'date', nullable: true, comment: '到期日期' })
  expiryDate?: Date;

  @Column({ type: 'text', nullable: true, comment: '合同内容/条款' })
  content?: string;

  @Column({ name: 'attachments', type: 'json', nullable: true, comment: '附件列表（JSON数组）' })
  attachments?: string[];

  @Column({ name: 'template_id', type: 'bigint', nullable: true, comment: '合同模板ID' })
  templateId?: number;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  @Column({ name: 'ownerId', type: 'bigint', nullable: true, comment: '负责人ID' })
  ownerId?: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'ownerId' })
  owner?: Member;

  @OneToMany(() => ContractItem, (contractItem) => contractItem.contract)
  items: ContractItem[];

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

