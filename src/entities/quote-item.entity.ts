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

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '数量' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '单价' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '金额' })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: '折扣(%)' })
  discount?: number;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

