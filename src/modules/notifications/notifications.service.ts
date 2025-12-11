import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../../entities/notification.entity';
import { NotificationSetting, NotificationChannel } from '../../entities/notification-setting.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationSetting)
    private readonly settingRepository: Repository<NotificationSetting>,
    @Inject(forwardRef(() => NotificationsGateway))
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * 创建通知
   */
  async create(createDto: CreateNotificationDto, tenantId: number): Promise<Notification> {
    // 检查用户是否启用了该类型的通知（如果禁用，仍然创建通知但不推送）
    const isEnabled = await this.isNotificationEnabled(
      createDto.receiverId,
      createDto.type,
      NotificationChannel.IN_APP,
    );

    const notification = this.notificationRepository.create({
      ...createDto,
      tenantId,
      status: NotificationStatus.UNREAD,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // 如果用户启用了通知，才实时推送
    if (isEnabled) {
      try {
        this.notificationsGateway.sendToUser(createDto.receiverId, savedNotification);
        // 更新未读数量
        const unreadCount = await this.getUnreadCount(createDto.receiverId, tenantId);
        this.notificationsGateway.broadcastUnreadCount(createDto.receiverId, unreadCount);
      } catch (error) {
        // WebSocket 推送失败不影响通知创建
        console.error('WebSocket 推送失败:', error);
      }
    }

    return savedNotification;
  }

  /**
   * 批量创建通知
   */
  async createBatch(receiverIds: number[], createDto: Omit<CreateNotificationDto, 'receiverId'>, tenantId: number): Promise<Notification[]> {
    // 过滤出启用了通知的用户
    const enabledUserIds: number[] = [];
    for (const receiverId of receiverIds) {
      const isEnabled = await this.isNotificationEnabled(
        receiverId,
        createDto.type,
        NotificationChannel.IN_APP,
      );
      if (isEnabled) {
        enabledUserIds.push(receiverId);
      }
    }

    if (enabledUserIds.length === 0) {
      return [];
    }

    const notifications = enabledUserIds.map((receiverId) =>
      this.notificationRepository.create({
        ...createDto,
        receiverId,
        tenantId,
        status: NotificationStatus.UNREAD,
      }),
    );

    const savedNotifications = await this.notificationRepository.save(notifications);

    // 实时推送通知给每个接收者
    const userUnreadCounts = new Map<number, number>();
    for (const notification of savedNotifications) {
      try {
        this.notificationsGateway.sendToUser(notification.receiverId, notification);
        
        // 收集每个用户的未读数量
        if (!userUnreadCounts.has(notification.receiverId)) {
          const count = await this.getUnreadCount(notification.receiverId, tenantId);
          userUnreadCounts.set(notification.receiverId, count);
          this.notificationsGateway.broadcastUnreadCount(notification.receiverId, count);
        }
      } catch (error) {
        // WebSocket 推送失败不影响通知创建
        console.error(`WebSocket 推送失败 - userId: ${notification.receiverId}:`, error);
      }
    }

    return savedNotifications;
  }

  /**
   * 获取用户通知列表
   */
  async findByUser(userId: number, tenantId: number, queryDto: QueryNotificationDto) {
    const { type, status, page = 1, limit = 20 } = queryDto;

    const where: any = {
      receiverId: userId,
      tenantId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: notifications,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取未读数量
   */
  async getUnreadCount(userId: number, tenantId: number): Promise<number> {
    return await this.notificationRepository.count({
      where: {
        receiverId: userId,
        tenantId,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  /**
   * 标记为已读
   */
  async markAsRead(notificationId: number, userId: number, tenantId: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.receiverId !== userId) {
      throw new ForbiddenException('无权操作此通知');
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    // 更新未读数量
    const unreadCount = await this.getUnreadCount(userId, tenantId);
    this.notificationsGateway.broadcastUnreadCount(userId, unreadCount);
  }

  /**
   * 全部标记为已读
   */
  async markAllAsRead(userId: number, tenantId: number): Promise<void> {
    await this.notificationRepository.update(
      {
        receiverId: userId,
        tenantId,
        status: NotificationStatus.UNREAD,
      },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    // 更新未读数量
    this.notificationsGateway.broadcastUnreadCount(userId, 0);
  }

  /**
   * 删除通知
   */
  async delete(notificationId: number, userId: number, tenantId: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, tenantId },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.receiverId !== userId) {
      throw new ForbiddenException('无权删除此通知');
    }

    await this.notificationRepository.remove(notification);

    // 更新未读数量
    const unreadCount = await this.getUnreadCount(userId, tenantId);
    this.notificationsGateway.broadcastUnreadCount(userId, unreadCount);
  }

  /**
   * 获取用户通知设置
   */
  async getSettings(userId: number): Promise<NotificationSetting[]> {
    return await this.settingRepository.find({
      where: { userId },
      order: { type: 'ASC', channel: 'ASC' },
    });
  }

  /**
   * 更新通知设置
   */
  async updateSetting(userId: number, updateDto: UpdateNotificationSettingDto): Promise<NotificationSetting> {
    let setting = await this.settingRepository.findOne({
      where: {
        userId,
        type: updateDto.type,
        channel: updateDto.channel,
      },
    });

    if (setting) {
      setting.enabled = updateDto.enabled;
    } else {
      setting = this.settingRepository.create({
        userId,
        type: updateDto.type,
        channel: updateDto.channel,
        enabled: updateDto.enabled,
      });
    }

    return await this.settingRepository.save(setting);
  }

  /**
   * 批量更新通知设置
   */
  async updateSettings(userId: number, settings: UpdateNotificationSettingDto[]): Promise<NotificationSetting[]> {
    const results: NotificationSetting[] = [];

    for (const settingDto of settings) {
      const setting = await this.updateSetting(userId, settingDto);
      results.push(setting);
    }

    return results;
  }

  /**
   * 检查用户是否启用了特定类型的通知
   */
  async isNotificationEnabled(userId: number, type: string, channel: NotificationChannel = NotificationChannel.IN_APP): Promise<boolean> {
    const setting = await this.settingRepository.findOne({
      where: {
        userId,
        type: type as any,
        channel,
      },
    });

    // 如果没有设置，默认启用
    return setting ? setting.enabled : true;
  }
}

