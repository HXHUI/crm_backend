import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'

export type OwnerType = 'tenant' | 'department' | 'member'

@Entity('target')
@Index('idx_tenant_month', ['tenantId', 'targetMonth'])
@Index('unique_target', ['tenantId', 'ownerType', 'ownerId', 'targetType', 'targetMonth'], { unique: true })
export class Target {
  @PrimaryGeneratedColumn()
  id: number
  @Column({ name: 'tenant_id', type: 'bigint', nullable: false, comment: '租户ID' })
  tenantId: number

  // 目标基本信息
  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: false, comment: '目标类型' })
  targetType: string

  // 目标值与时间
  @Column({ name: 'target_value', type: 'decimal', precision: 20, scale: 2, nullable: false, comment: '目标值' })
  targetValue: string

  @Column({ name: 'current_value', type: 'decimal', precision: 20, scale: 2, default: 0, comment: '当前完成值' })
  currentValue: string

  @Column({ type: 'varchar', length: 20, default: '元', comment: '单位' })
  unit: string

  @Column({ name: 'target_month', type: 'date', comment: '目标月份' })
  targetMonth: string

  // 归属
  @Column({ name: 'owner_type', type: 'enum', enum: ['tenant', 'department', 'member'], comment: '所有者类型' })
  ownerType: OwnerType

  @Column({ name: 'owner_id', type: 'bigint', comment: '所有者ID' })
  ownerId: number

  // 进度
  @Column({ name: 'completion_rate', type: 'decimal', precision: 5, scale: 2, default: 0, comment: '完成率' })
  completionRate: string

  @Column({ type: 'enum', enum: ['active', 'completed'], default: 'active' })
  status: 'active' | 'completed'

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: number

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy?: number

  @CreateDateColumn({ name: 'createdAt', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updatedAt', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date

  @DeleteDateColumn({ name: 'deletedAt', type: 'datetime', nullable: true })
  deletedAt?: Date
}


