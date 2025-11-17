import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ProductStatus {
  ACTIVE = 'active',      // 启用
  INACTIVE = 'inactive', // 停用
}

@Entity('products')
export class Product extends BaseEntity {
  @Column({ comment: '产品名称' })
  name: string;

  @Column({ nullable: true, comment: '产品编码' })
  code?: string;

  @Column({ nullable: true, comment: '产品分类' })
  category?: string;

  @Column({ nullable: true, comment: '产品规格' })
  specification?: string;

  @Column({ nullable: true, comment: '单位' })
  unit?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '价格' })
  price?: number;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '成本价' })
  costPrice?: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
    comment: '产品状态',
  })
  status: ProductStatus;

  @Column({ name: 'main_image', nullable: true, comment: '主图' })
  mainImage?: string;

  @Column({ name: 'detail_images', type: 'json', nullable: true, comment: '详情图（最多9张）' })
  detailImages?: string[];

  @Column({ nullable: true, comment: '产品描述' })
  description?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

