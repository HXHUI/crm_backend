import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';

export enum InvoiceRequirement {
  SPECIAL_VAT = 'special_vat',      // 专票
  NORMAL_INVOICE = 'normal_invoice', // 普票
  NO_INVOICE = 'no_invoice',         // 不开票
}

export enum CreditTier {
  TIER_150K = 'tier_150k', // 15万
  TIER_100K = 'tier_100k', // 10万
  TIER_50K = 'tier_50k',   // 5万
  NONE = 'none',            // 无
}

@Entity('customer_profiles')
export class CustomerProfile extends BaseEntity {
  @Column({ name: 'customer_id', type: 'bigint', comment: '客户ID' })
  customerId: number;

  @OneToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({
    name: 'invoice_requirement',
    type: 'enum',
    enum: InvoiceRequirement,
    nullable: true,
    comment: '开票要求：专票/普票/不开票',
  })
  invoiceRequirement?: InvoiceRequirement;

  @Column({ name: 'invoice_remark', type: 'varchar', length: 500, nullable: true, comment: '开票说明' })
  invoiceRemark?: string;

  @Column({ name: 'shipping_methods', type: 'json', nullable: true, comment: '货运方式数组：专车/物流/自提/快递' })
  shippingMethods?: string[];

  @Column({ name: 'credit_limit', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '信用额度（元）' })
  creditLimit?: number;

  @Column({
    name: 'credit_tier',
    type: 'enum',
    enum: CreditTier,
    nullable: true,
    comment: '信用额度档位：15万/10万/5万/无',
  })
  creditTier?: CreditTier;

  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({
    name: 'fund_status',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '资金状况：abundant(充裕)/normal(一般)/tight(紧张)',
  })
  fundStatus?: string;

  @Column({
    name: 'business_years',
    type: 'int',
    nullable: true,
    comment: '经营年限（年）',
  })
  businessYears?: number;

  @Column({
    name: 'industry_reputation',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '行业口碑：good(优)/fair(良)/bad(差)',
  })
  industryReputation?: string;

  @Column({
    name: 'growth_potential',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '发展潜力：high(大)/medium(中)/low(小)',
  })
  growthPotential?: string;

  @Column({
    name: 'owner_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '老板类型：aggressive(开拓型)/conservative(保守型)',
  })
  ownerType?: string;

  @Column({
    name: 'overall_comment',
    type: 'text',
    nullable: true,
    comment: '综评结论',
  })
  overallComment?: string;
}

