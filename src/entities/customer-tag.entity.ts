import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('customer_tags')
export class CustomerTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, comment: '标签名称' })
  name: string;

  @Column({ type: 'varchar', length: 7, default: '#1890ff', comment: '标签颜色' })
  color: string;

  @Column({ type: 'text', nullable: true, comment: '标签描述' })
  description: string;

  @Column({ type: 'varchar', length: 36, name: 'tenant_id', comment: '租户ID' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', comment: '删除时间' })
  deletedAt: Date;

  // 关系
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
