import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Query() queryDto: QueryNotificationDto, @CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    const result = await this.notificationsService.findByUser(userId, tenantId, queryDto);
    return {
      code: 200,
      message: '获取通知列表成功',
      data: result,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    const count = await this.notificationsService.getUnreadCount(userId, tenantId);
    return {
      code: 200,
      message: '获取未读数量成功',
      data: { count },
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    await this.notificationsService.markAsRead(parseInt(id, 10), userId, tenantId);
    return {
      code: 200,
      message: '标记为已读成功',
    };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    await this.notificationsService.markAllAsRead(userId, tenantId);
    return {
      code: 200,
      message: '全部标记为已读成功',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;

    await this.notificationsService.delete(parseInt(id, 10), userId, tenantId);
    return {
      code: 200,
      message: '删除通知成功',
    };
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: any) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const settings = await this.notificationsService.getSettings(userId);
    return {
      code: 200,
      message: '获取通知设置成功',
      data: settings,
    };
  }

  @Put('settings')
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() settings: UpdateNotificationSettingDto[],
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.notificationsService.updateSettings(userId, settings);
    return {
      code: 200,
      message: '更新通知设置成功',
      data: result,
    };
  }
}

