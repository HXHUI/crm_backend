import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { WorkflowTemplate } from './workflow-template.entity';
import { Member } from './member.entity';
import { Role } from './role.entity';
import { Department } from './department.entity';

export enum NodeType {
  FIXED_MEMBER = 'fixed_member',           // 固定成员
  ROLE = 'role',                          // 角色
  DEPARTMENT_MANAGER = 'department_manager', // 部门负责人
}

export enum ApprovalMode {
  SEQUENTIAL = 'sequential',  // 串行审批
  PARALLEL = 'parallel',      // 并行审批（会签）
}

@Entity('workflow_nodes')
export class WorkflowNode extends BaseEntity {
  @Column({ comment: '节点名称' })
  name: string;

  @Column({ name: 'node_order', type: 'int', comment: '节点顺序' })
  nodeOrder: number;

  @Column({
    type: 'enum',
    enum: NodeType,
    comment: '节点类型',
  })
  nodeType: NodeType;

  @Column({
    type: 'enum',
    enum: ApprovalMode,
    default: ApprovalMode.SEQUENTIAL,
    comment: '审批方式',
  })
  approvalMode: ApprovalMode;

  // 审批人配置（JSON格式）
  // 固定成员: { memberIds: [1, 2, 3] }
  // 角色: { roleIds: [1, 2] }
  // 部门负责人: { departmentIds: [1, 2], includeParent: true } // includeParent表示是否包含上级部门负责人
  @Column({ name: 'approver_config', type: 'json', comment: '审批人配置' })
  approverConfig: Record<string, any>;

  // 关联审批流模板
  @Column({ name: 'template_id', type: 'bigint', comment: '审批流模板ID' })
  templateId: number;

  @ManyToOne(() => WorkflowTemplate, (template) => template.nodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: WorkflowTemplate;
}

