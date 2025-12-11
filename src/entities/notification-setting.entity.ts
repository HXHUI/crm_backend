import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { NotificationType } from './notification.entity';

export enum NotificationChannel {
  IN_APP = 'in_app',     // 站内通知
  EMAIL = 'email',       // 邮件
  SMS = 'sms',           // 短信
}

@Entity('notification_settings')
@Unique(['userId', 'type', 'channel'])
export class NotificationSetting extends BaseEntity {
  @Column({ name: 'user_id', type: 'bigint', comment: '用户ID' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: '通知类型',
  })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    comment: '通知渠道',
  })
  channel: NotificationChannel;

  @Column({ default: true, comment: '是否启用' })
  enabled: boolean;
}

