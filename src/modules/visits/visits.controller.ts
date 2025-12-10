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
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CreateVisitDto, UpdateVisitDto, QueryVisitDto, CheckInDto } from './dto/visit.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('visits')
@UseGuards(JwtAuthGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  async create(@Body() createDto: CreateVisitDto, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const departmentId = req.user.currentDepartmentId 
      ? (typeof req.user.currentDepartmentId === 'string' ? parseInt(req.user.currentDepartmentId, 10) : req.user.currentDepartmentId)
      : undefined;
    const visit = await this.visitsService.create(createDto, memberId, tenantId, departmentId);

    return {
      code: 201,
      message: '拜访记录创建成功',
      data: visit,
    };
  }

  @Get()
  async findAll(@Query() queryDto: QueryVisitDto, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const result = await this.visitsService.findAll(queryDto, tenantId);

    return {
      code: 200,
      message: '获取拜访列表成功',
      data: result,
    };
  }

  @Get('stats')
  async getStats(
    @Query('ownerId') ownerId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Request() req,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const ownerIdNum = ownerId ? parseInt(ownerId, 10) : undefined;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const stats = await this.visitsService.getVisitStats(tenantId, ownerIdNum, start, end);

    return {
      code: 200,
      message: '获取拜访统计成功',
      data: stats,
    };
  }

  @Get('upcoming')
  async getUpcomingVisits(
    @Query('days') days: string | undefined,
    @Request() req,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const daysNum = days ? parseInt(days, 10) : 7;
    const visits = await this.visitsService.getUpcomingVisits(memberId, tenantId, daysNum);

    return {
      code: 200,
      message: '获取即将到来的拜访成功',
      data: visits,
    };
  }

  @Get('customer/:customerId')
  async getVisitsByCustomer(@Param('customerId', ParseIntPipe) customerId: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visits = await this.visitsService.getVisitsByCustomer(customerId, tenantId);

    return {
      code: 200,
      message: '获取客户拜访记录成功',
      data: visits,
    };
  }

  @Get('contact/:contactId')
  async getVisitsByContact(@Param('contactId', ParseIntPipe) contactId: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visits = await this.visitsService.getVisitsByContact(contactId, tenantId);

    return {
      code: 200,
      message: '获取联系人拜访记录成功',
      data: visits,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.findOne(id, tenantId);

    return {
      code: 200,
      message: '获取拜访详情成功',
      data: visit,
    };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateVisitDto,
    @Request() req,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.update(id, updateDto, tenantId);

    return {
      code: 200,
      message: '拜访记录更新成功',
      data: visit,
    };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    await this.visitsService.remove(id, tenantId);

    return {
      code: 200,
      message: '拜访记录删除成功',
    };
  }

  @Post('batch-delete')
  async batchRemove(@Body() body: { ids: number[] }, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    await this.visitsService.batchRemove(body.ids, tenantId);

    return {
      code: 200,
      message: '批量删除拜访记录成功',
    };
  }

  @Post(':id/check-in')
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() checkInDto: CheckInDto,
    @Request() req,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.checkIn(id, checkInDto, tenantId);

    return {
      code: 200,
      message: '签到成功',
      data: visit,
    };
  }

  @Post(':id/start')
  async startVisit(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.startVisit(id, tenantId);

    return {
      code: 200,
      message: '拜访已开始',
      data: visit,
    };
  }

  @Post(':id/complete')
  async completeVisit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { result?: string; feedback?: string; nextAction?: string },
    @Request() req,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.completeVisit(
      id,
      body.result,
      body.feedback,
      body.nextAction,
      tenantId,
    );

    return {
      code: 200,
      message: '拜访已完成',
      data: visit,
    };
  }

  @Post(':id/cancel')
  async cancelVisit(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const visit = await this.visitsService.cancelVisit(id, tenantId);

    return {
      code: 200,
      message: '拜访已取消',
      data: visit,
    };
  }
}

