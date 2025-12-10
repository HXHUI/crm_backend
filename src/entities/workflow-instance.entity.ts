import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkflowTemplate } from './workflow-template.entity';
import { Member } from './member.entity';
import { WorkflowRecord } from './workflow-record.entity';
import { BusinessType } from './workflow-template.entity';

export enum InstanceStatus {
  PENDING = 'pending',           // 审批中
  APPROVED = 'approved',         // 已通过
  REJECTED = 'rejected',         // 已拒绝
  CANCELLED = 'cancelled',       // 已取消
  RETURNED = 'returned',        // 已退回
}

@Entity('workflow_instances')
export class WorkflowInstance extends BaseEntity {
  @Column({
    type: 'enum',
    enum: BusinessType,
    comment: '业务类型',
  })
  businessType: BusinessType;

  @Column({ name: 'business_id', type: 'bigint', comment: '业务对象ID' })
  businessId: number;

  @Column({ name: 'template_id', type: 'bigint', comment: '审批流模板ID' })
  templateId: number;

  @ManyToOne(() => WorkflowTemplate)
  @JoinColumn({ name: 'template_id' })
  template: WorkflowTemplate;

  @Column({
    type: 'enum',
    enum: InstanceStatus,
    default: InstanceStatus.PENDING,
    comment: '审批状态',
  })
  status: InstanceStatus;

  @Column({ name: 'current_node_id', type: 'bigint', nullable: true, comment: '当前审批节点ID' })
  currentNodeId?: number;

  @Column({ name: 'current_node_order', type: 'int', nullable: true, comment: '当前节点顺序' })
  currentNodeOrder?: number;

  @Column({ name: 'initiator_id', type: 'bigint', comment: '发起人ID' })
  initiatorId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'initiator_id' })
  initiator: Member;

  @Column({ name: 'submit_comment', type: 'text', nullable: true, comment: '提交说明' })
  submitComment?: string;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true, comment: '完成时间' })
  completedAt?: Date;

  @OneToMany(() => WorkflowRecord, (record) => record.instance)
  records: WorkflowRecord[];

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;
}

