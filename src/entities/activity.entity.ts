import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Member } from './member.entity';

export enum ActivityType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  TASK = 'task',
  NOTE = 'note',
  WECHAT = 'wechat',
  DEMO = 'demo',
  PRESENTATION = 'presentation',
  FOLLOW_UP = 'follow_up',
}

export enum ActivityStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RelatedToType {
  CUSTOMER = 'customer',
  CONTACT = 'contact',
  OPPORTUNITY = 'opportunity',
  LEAD = 'lead',
}

export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('activities')
export class Activity extends BaseEntity {
  @Column({ comment: '活动标题' })
  title: string;

  @Column({ nullable: true, comment: '活动描述' })
  description?: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    comment: '活动类型',
  })
  type: ActivityType;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.PLANNED,
    comment: '活动状态',
  })
  status: ActivityStatus;

  @Column({ name: 'planned_start_time', type: 'datetime', nullable: true, comment: '计划开始时间' })
  plannedStartTime?: Date;

  @Column({ name: 'planned_end_time', type: 'datetime', nullable: true, comment: '计划结束时间' })
  plannedEndTime?: Date;

  @Column({ name: 'actual_start_time', type: 'datetime', nullable: true, comment: '实际开始时间' })
  actualStartTime?: Date;

  @Column({ name: 'actual_end_time', type: 'datetime', nullable: true, comment: '实际结束时间' })
  actualEndTime?: Date;

  @Column({ nullable: true, comment: '活动地点' })
  location?: string;

  @Column({ nullable: true, comment: '活动结果' })
  outcome?: string;

  @Column({ type: 'json', nullable: true, comment: '活动附件' })
  attachments?: string[];

  @Column({ type: 'json', nullable: true, comment: '活动参与者' })
  participants?: string[];

  // 统一关联：线索/联系人/商机/客户
  @Column({
    name: 'relatedToType',
    type: 'enum',
    enum: RelatedToType,
    comment: '关联主体类型',
  })
  relatedToType: RelatedToType;

  @Column({ name: 'relatedToId', type: 'bigint', nullable: true, comment: '关联主体ID' })
  relatedToId?: number;

  // 分配人（指派者）
  @Column({ name: 'assignedBy', type: 'bigint', nullable: true, comment: '分配人(成员ID)' })
  assignedBy?: number;

  @Column({ name: 'owner_id', type: 'bigint', comment: '负责人ID' })
  ownerId: number;

  @ManyToOne(() => Member)
  @JoinColumn({ name: 'owner_id' })
  owner: Member;

  @Column({ name: 'department_id', type: 'bigint', nullable: true, comment: '部门ID' })
  departmentId?: number;

  @Column({
    type: 'enum',
    enum: ActivityPriority,
    default: ActivityPriority.MEDIUM,
    comment: '优先级',
  })
  priority: ActivityPriority;

  @Column({ type: 'text', nullable: true, comment: '活动详细内容/完成笔记' })
  content?: string;

  // 租户ID
  @Column({ name: 'tenant_id', type: 'bigint', nullable: true, comment: '租户ID' })
  tenantId?: number;

  @Column({ name: 'created_by', type: 'bigint', nullable: true, comment: '创建者ID（成员ID）' })
  createdBy?: number;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: Member;
}
