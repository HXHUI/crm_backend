import { IsEnum, IsBoolean } from 'class-validator';
import { NotificationType } from '../../../entities/notification.entity';
import { NotificationChannel } from '../../../entities/notification-setting.entity';

export class UpdateNotificationSettingDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsBoolean()
  enabled: boolean;
}

