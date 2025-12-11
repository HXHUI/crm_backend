import { IsEnum, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @IsNumber()
  receiverId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    businessType?: string;
    businessId?: number;
    instanceId?: number;
    link?: string;
    [key: string]: any;
  };
}

