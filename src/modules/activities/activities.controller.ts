import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivitiesService, CreateActivityDto, UpdateActivityDto } from './activities.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('activities')
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createActivity(@Body() createActivityDto: CreateActivityDto, @CurrentUser() user: any) {
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const activity = await this.activitiesService.createActivity(createActivityDto, user.memberId, user.tenantId, departmentId);
    return {
      code: 201,
      message: '创建活动成功',
      data: activity
    };
  }

  @Get()
  async findAllActivities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('title') title?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('relatedToType') relatedToType?: string,
    @Query('relatedToId') relatedToId?: string,
    @Query('ownerId') ownerId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @CurrentUser() user?: any,
  ) {
    // 默认查询当前租户所有人的活动；如需只看自己，可传 ownerId=user.memberId
    const filters = { title, type, status, relatedToType, relatedToId, ownerId, sortBy, sortOrder };
    const result = await this.activitiesService.findAllActivities(user.tenantId, page, limit, filters);
    return {
      code: 200,
      message: '获取活动列表成功',
      data: result
    };
  }

  @Get('stats')
  async getActivityStats(@CurrentUser() user: any) {
    const stats = await this.activitiesService.getActivityStats(user.memberId);
    return {
      code: 200,
      message: '获取活动统计成功',
      data: stats
    };
  }

  @Get('upcoming')
  async getUpcomingActivities(
    @Query('days') days?: number,
    @CurrentUser() user?: any,
  ) {
    const activities = await this.activitiesService.getUpcomingActivities(user.memberId, days);
    return {
      code: 200,
      message: '获取即将到来的活动成功',
      data: activities
    };
  }

  @Get(':id')
  async findActivityById(@Param('id') id: string, @CurrentUser() user: any) {
    const activity = await this.activitiesService.findActivityById(parseInt(id, 10), user.memberId);
    return {
      code: 200,
      message: '获取活动详情成功',
      data: activity
    };
  }

  @Patch(':id')
  async updateActivity(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @CurrentUser() user: any,
  ) {
    // 确保 memberId 是数字类型
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const activity = await this.activitiesService.updateActivity(parseInt(id, 10), updateActivityDto, memberId);
    return {
      code: 200,
      message: '更新活动成功',
      data: activity
    };
  }

  @Patch(':id/start')
  async startActivity(@Param('id') id: string, @CurrentUser() user: any) {
    const activity = await this.activitiesService.startActivity(parseInt(id, 10), user.memberId);
    return {
      code: 200,
      message: '开始活动成功',
      data: activity
    };
  }

  @Patch(':id/complete')
  async completeActivity(
    @Param('id') id: string,
    @Body() body: { outcome: string },
    @CurrentUser() user: any,
  ) {
    const activity = await this.activitiesService.completeActivity(parseInt(id, 10), body.outcome, user.memberId);
    return {
      code: 200,
      message: '完成活动成功',
      data: activity
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteActivity(@Param('id') id: string, @CurrentUser() user: any) {
    await this.activitiesService.deleteActivity(parseInt(id, 10), user.memberId);
    return {
      code: 200,
      message: '删除活动成功'
    };
  }

  @Delete('batch')
  @HttpCode(HttpStatus.OK)
  async deleteBatchActivities(@Body() body: { ids: string[] }, @CurrentUser() user: any) {
    await this.activitiesService.deleteBatchActivities(body.ids.map(id => parseInt(id, 10)), user.memberId);
    return {
      code: 200,
      message: '批量删除活动成功'
    };
  }
}
