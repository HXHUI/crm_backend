import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum DictStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('dict_types')
export class DictType extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID（NULL为系统级）' })
  tenantId?: number | null;

  @Column({ length: 100, comment: '字典类型编码（在租户内唯一）' })
  code: string;

  @Column({ length: 100, comment: '字典类型名称' })
  name: string;

  @Column({ type: 'text', nullable: true, comment: '描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: DictStatus,
    default: DictStatus.ACTIVE,
    comment: '状态',
  })
  status: DictStatus;
}

