import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { CustomerCompetitor } from './customer-competitor.entity';

export enum CompetitorAlternativeRelatedType {
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
  CONTRACT = 'contract',
  ORDER = 'order',
}

@Entity('competitor_alternatives')
export class CompetitorAlternative extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', nullable: false, comment: '租户ID' })
  tenantId: number;

  @Column({ name: 'competitor_id', type: 'bigint', nullable: false, comment: '关联的意向竞品ID' })
  @Index()
  competitorId: number;

  @ManyToOne(() => CustomerCompetitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitor_id' })
  competitor: CustomerCompetitor;

  @Column({
    name: 'related_type',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '关联类型：customer/opportunity/contract/order',
  })
  @Index()
  relatedType?: CompetitorAlternativeRelatedType | null;

  @Column({
    name: 'related_id',
    type: 'bigint',
    nullable: true,
    comment: '关联对象ID',
  })
  @Index()
  relatedId?: number | null;

  @Column({
    name: 'product_id',
    type: 'bigint',
    nullable: true,
    comment: '本公司产品ID（可选）',
  })
  productId?: number | null;

  @Column({
    name: 'product_name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: '本公司可替代产品名称',
  })
  productName: string;

  @Column({
    name: 'spec',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '规格型号',
  })
  spec?: string | null;

  @Column({
    name: 'unit',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '计量单位',
  })
  unit?: string | null;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '单价（万元）',
  })
  unitPrice?: number | null;

  @Column({
    name: 'annual_potential_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    nullable: true,
    comment: '预估年用量/金额（万元）',
  })
  annualPotentialAmount?: number | null;

  @Column({
    name: 'advantages',
    type: 'text',
    nullable: true,
    comment: '相对竞品的优势',
  })
  advantages?: string | null;

  @Column({
    name: 'disadvantages',
    type: 'text',
    nullable: true,
    comment: '可能的短板/风险',
  })
  disadvantages?: string | null;

  @Column({
    name: 'strategy',
    type: 'text',
    nullable: true,
    comment: '销售/报价策略',
  })
  strategy?: string | null;

  @Column({
    name: 'notes',
    type: 'text',
    nullable: true,
    comment: '备注',
  })
  notes?: string | null;
}


