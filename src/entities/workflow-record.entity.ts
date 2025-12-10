import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkflowInstance } from './workflow-instance.entity';
import { WorkflowNode } from './workflow-node.entity';
import { Member } from './member.entity';

export enum RecordAction {
  PENDING = 'pending',         // 待审批
  APPROVE = 'approve',         // 通过
  REJECT = 'reject',           // 拒绝
  TRANSFER = 'transfer',       // 转办
  ADD_SIGN = 'add_sign',       // 加签
  RETURN = 'return',           // 退回
  CANCEL = 'cancel',           // 取消
}

@Entity('workflow_records')
export class WorkflowRecord extends BaseEntity {
  @Column({ name: 'instance_id', type: 'bigint', comment: '审批实例ID' })
  instanceId: number;

  @ManyToOne(() => WorkflowInstance, (instance) => instance.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instance_id' })
  instance: WorkflowInstance;

  @Column({ name: 'node_id', type: 'bigint', nullable: true, comment: '审批节点ID' })
  nodeId?: number;

  @ManyToOne(() => WorkflowNode, { nullable: true })
  @JoinColumn({ name: 'node_id' })
  node?: WorkflowNode;

  @Column({ name: 'node_order', type: 'int', nullable: true, comment: '节点顺序' })
  nodeOrder?: number;

  @Column({ name: 'approver_id', type: 'bigint', comment: '审批人ID' })
  approverId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'approver_id' })
  approver: Member;

  @Column({
    type: 'enum',
    enum: RecordAction,
    comment: '审批动作',
  })
  action: RecordAction;

  @Column({ name: 'comment', type: 'text', nullable: true, comment: '审批意见' })
  comment?: string;

  // 转办/加签相关信息（JSON格式）
  // 转办: { transferredTo: memberId }
  // 加签: { addedApprovers: [memberId1, memberId2] }
  @Column({ name: 'extra_data', type: 'json', nullable: true, comment: '额外数据' })
  extraData?: Record<string, any>;

  @Column({ name: 'action_time', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', comment: '操作时间' })
  actionTime: Date;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;
}

