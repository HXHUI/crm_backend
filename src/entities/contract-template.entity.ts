import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

export enum ContractTemplateType {
  SALES = 'sales',          // 销售合同模板
  SERVICE = 'service',      // 服务合同模板
  MAINTENANCE = 'maintenance', // 维护合同模板
  OTHER = 'other',          // 其他
}

@Entity('contract_templates')
export class ContractTemplate extends BaseEntity {
  @Column({ comment: '模板名称' })
  name: string;

  @Column({
    type: 'enum',
    enum: ContractTemplateType,
    default: ContractTemplateType.SALES,
    comment: '模板类型',
  })
  type: ContractTemplateType;

  @Column({ type: 'text', nullable: true, comment: '模板内容' })
  content?: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @Column({ nullable: true, comment: '备注' })
  notes?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;
}

