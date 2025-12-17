import { Entity, Column, Index } from 'typeorm'
import { BaseEntity } from './base.entity'

export enum RelatedType {
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
  CONTRACT = 'contract',
  ORDER = 'order',
}

@Entity('customer_competitors')
export class CustomerCompetitor extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number | null

  @Column({ name: 'related_type', type: 'varchar', length: 50, comment: '关联类型：customer/opportunity/contract/order' })
  @Index()
  relatedType: RelatedType

  @Column({ name: 'related_id', type: 'bigint', comment: '关联对象ID' })
  @Index()
  relatedId: number

  @Column({ name: 'manufacturer', type: 'varchar', length: 200, comment: '竞品厂家' })
  manufacturer: string

  @Column({ name: 'product_name', type: 'varchar', length: 200, nullable: true, comment: '产品名称' })
  productName?: string | null

  @Column({
    name: 'annual_usage_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '年用量（金额），单位：万元',
  })
  annualUsageAmount?: number | null

  @Column({ name: 'unit', type: 'varchar', length: 50, nullable: true, comment: '单位' })
  unit?: string | null

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    comment: '单价，单位：万元',
  })
  unitPrice?: number | null

  @Column({ name: 'policy', type: 'text', nullable: true, comment: '政策' })
  policy?: string | null

  @Column({ name: 'advantages', type: 'text', nullable: true, comment: '优势' })
  advantages?: string | null

  @Column({ name: 'problems', type: 'text', nullable: true, comment: '存在的问题' })
  problems?: string | null
}

