import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Quote } from './quote.entity';
import { Product } from './product.entity';

@Entity('quote_items')
export class QuoteItem extends BaseEntity {
  @Column({ name: 'quote_id', type: 'bigint', comment: '报价ID' })
  quoteId: number;

  @ManyToOne(() => Quote, (quote) => quote.items)
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column({ name: 'product_id', type: 'bigint', comment: '产品ID' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '数量（主单位）' })
  quantity: number;

  @Column({ name: 'packaging_unit', nullable: true, comment: '包装单位（显示用）' })
  packagingUnit?: string;

  @Column({ name: 'packaging_spec', nullable: true, comment: '包装规格说明（显示用）' })
  packagingSpec?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '单价（主单位）' })
  unitPrice: number;

  @Column({
    name: 'unit_price_excl_tax',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '不含税单价',
  })
  unitPriceExclTax: number;

  @Column({
    name: 'tax_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: '税率(%)',
  })
  taxRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '金额' })
  amount: number;

  @Column({
    name: 'amount_excl_tax',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '不含税金额',
  })
  amountExclTax: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: '税金',
  })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: '折扣(%)' })
  discount?: number;

  @Column({ name: 'price_components', type: 'json', nullable: true, comment: '价格组成项（复杂模式）' })
  priceComponents?: Record<string, number>;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

