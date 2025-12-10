import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';

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

  @Column({
    name: 'auxiliary_units',
    type: 'json',
    nullable: true,
    comment: '辅助计量单位配置（JSON数组，格式：[{unit, conversionRate, purpose, description}]）',
  })
  auxiliaryUnits?: Array<{
    unit: string;              // 辅助单位名称，如："袋"、"吨"
    conversionRate: number;    // 转换率（1个辅助单位 = conversionRate个主单位）
    purpose: 'sales' | 'purchase' | 'internal' | 'external';  // 用途：销售、采购、内包、外包
    description?: string;      // 详细描述，如："1袋=25kg"、"1吨=1000kg"
  }>;

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

  @Column({ name: 'category_fields', type: 'json', nullable: true, comment: '动态分类字段（JSON格式，存储配置的分类字段值）' })
  categoryFields?: Record<string, string>;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}

