import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Tenant } from './tenant.entity';
import { WorkflowNode } from './workflow-node.entity';

export enum BusinessType {
  QUOTE = 'quote',           // 报价
  CONTRACT = 'contract',     // 合同
  ORDER = 'order',          // 订单
}

@Entity('workflow_templates')
export class WorkflowTemplate extends BaseEntity {
  @Column({ comment: '模板名称' })
  name: string;

  @Column({ nullable: true, comment: '模板描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: BusinessType,
    comment: '业务类型',
  })
  businessType: BusinessType;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({ name: 'version', type: 'int', default: 1, comment: '版本号' })
  version: number;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => WorkflowNode, (node) => node.template, { cascade: true })
  nodes: WorkflowNode[];
}

