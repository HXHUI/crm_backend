import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SystemAdminGuard } from '../../common/guards/system-admin.guard';
import { SystemAdminService, CreateSystemAdminDto } from './system-admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('system-admins')
@UseGuards(JwtAuthGuard, SystemAdminGuard)
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  // GET /system-admins - 获取系统管理员列表
  @Get()
  async getSystemAdmins(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const result = await this.systemAdminService.getSystemAdmins(page, limit, search);
    return {
      code: 200,
      message: '获取系统管理员列表成功',
      data: result
    };
  }

  // POST /system-admins - 添加系统管理员
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSystemAdmin(
    @Body() createDto: CreateSystemAdminDto,
    @CurrentUser() user: any,
  ) {
    const createdByUserId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.systemAdminService.createSystemAdmin(createDto, createdByUserId);
    return {
      code: 201,
      message: '添加系统管理员成功',
      data: result
    };
  }

  // DELETE /system-admins/:id - 移除系统管理员权限
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async removeSystemAdmin(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const operatorId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const targetId = parseInt(id, 10);
    
    // 不能移除自己
    if (targetId === operatorId) {
      throw new ForbiddenException('不能移除自己的系统管理员权限');
    }
    
    await this.systemAdminService.removeSystemAdmin(targetId, operatorId);
    return {
      code: 200,
      message: '移除系统管理员权限成功'
    };
  }

  // POST /system-admins/:id/restore - 恢复系统管理员权限
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restoreSystemAdmin(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const operatorId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.systemAdminService.restoreSystemAdmin(parseInt(id, 10), operatorId);
    return {
      code: 200,
      message: '恢复系统管理员权限成功',
      data: result
    };
  }
}

