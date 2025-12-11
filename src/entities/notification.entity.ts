import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum NotificationType {
  WORKFLOW = 'workflow',     // 审批流程
  SYSTEM = 'system',         // 系统通知
  TASK = 'task',             // 任务提醒
  MESSAGE = 'message',       // 消息
  REMINDER = 'reminder',     // 提醒
}

export enum NotificationStatus {
  UNREAD = 'unread',         // 未读
  READ = 'read',             // 已读
}

@Entity('notifications')
export class Notification extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'bigint', comment: '租户ID' })
  tenantId: number;

  @Column({ name: 'receiver_id', type: 'bigint', comment: '接收者ID（用户ID）' })
  receiverId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiver_id' })
  receiver?: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.WORKFLOW,
    comment: '通知类型',
  })
  type: NotificationType;

  @Column({ comment: '标题' })
  title: string;

  @Column({ type: 'text', comment: '内容' })
  content: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '扩展数据（如业务ID、链接等）',
  })
  metadata?: {
    businessType?: string;
    businessId?: number;
    instanceId?: number;
    link?: string;
    [key: string]: any;
  };

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
    comment: '状态',
  })
  status: NotificationStatus;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true, comment: '阅读时间' })
  readAt?: Date;
}

