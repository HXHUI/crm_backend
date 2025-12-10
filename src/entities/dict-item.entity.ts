import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('dict_items')
export class DictItem extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID（NULL为系统级）' })
  tenantId?: number | null;

  @Column({ name: 'type_code', length: 100, comment: '字典类型编码' })
  typeCode: string;

  @Column({ length: 100, comment: '编码值，用于业务逻辑和拼接' })
  value: string;

  @Column({ length: 200, comment: '显示名称' })
  label: string;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true, comment: '父级字典项ID，用于层级结构' })
  parentId?: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序号' })
  sortOrder: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: '状态：active/inactive',
  })
  status: string;
}
