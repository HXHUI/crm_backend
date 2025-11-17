import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Contract } from './contract.entity';
import { Product } from './product.entity';

@Entity('contract_items')
export class ContractItem extends BaseEntity {
  @Column({ name: 'contract_id', type: 'bigint', comment: '合同ID' })
  contractId: number;

  @ManyToOne(() => Contract, (contract) => contract.items)
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

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

