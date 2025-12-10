import { Controller, Get, Post, Put, Body, Param, Query, Delete, UseGuards, HttpCode, HttpStatus, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService, CreateLeadDto } from './leads.service';
import { SOURCE_OPTIONS } from '../../common/constants/source';

@Controller('leads')
@UseGuards(AuthGuard('jwt'))
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateLeadDto, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const departmentId = req.user.currentDepartmentId 
      ? (typeof req.user.currentDepartmentId === 'string' ? parseInt(req.user.currentDepartmentId, 10) : req.user.currentDepartmentId)
      : undefined;
    const data = await this.leadsService.create(dto, tenantId, memberId, departmentId);
    return { code: 201, message: '创建线索成功', data };
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: Partial<CreateLeadDto>, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const data = await this.leadsService.update(parseInt(id, 10), dto, tenantId);
    return { code: 200, message: '更新线索成功', data };
  }

  @Get()
  async list(
    @Request() req: any,
    @Query('page') page: any = 1,
    @Query('limit') limit: any = 50,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
    @Query('source') source?: string,
    @Query('ownerId') ownerId?: string,
    @Query('includeSubordinates') includeSubordinates?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    console.log('[LeadsController] 原始查询参数:', { page, limit, search, status, rating, source, ownerId, includeSubordinates, tenantId, memberId });
    console.log('[LeadsController] 参数类型:', { 
      page: typeof page, 
      limit: typeof limit, 
      search: typeof search, 
      status: typeof status, 
      rating: typeof rating, 
      source: typeof source,
      ownerId: typeof ownerId,
    });
    
    // 处理参数：空字符串转为undefined，确保只传递有效值
    const processedSearch = search && search.trim() ? search.trim() : undefined;
    const processedStatus = status && status.trim() ? status.trim() : undefined;
    const processedRating = rating && rating.trim() ? rating.trim() : undefined;
    const processedSource = source && source.trim() ? source.trim() : undefined;
    // ownerId 为 'null' 字符串时，转换为 null；否则转换为数字或 undefined
    let processedOwnerId: number | null | undefined = undefined;
    if (ownerId !== undefined) {
      if (ownerId === 'null' || ownerId === null) {
        processedOwnerId = null;
      } else if (ownerId && ownerId.trim()) {
        processedOwnerId = parseInt(ownerId.trim(), 10);
        if (isNaN(processedOwnerId)) {
          processedOwnerId = undefined;
        }
      }
    }
    
    console.log('[LeadsController] 处理后的参数:', { 
      page: Number(page), 
      limit: Number(limit), 
      search: processedSearch, 
      status: processedStatus, 
      rating: processedRating, 
      source: processedSource,
      ownerId: processedOwnerId,
    });
    
    // 处理 includeSubordinates 参数
    // 线索管理页面默认包含下级用户
    const processedIncludeSubordinates = includeSubordinates === 'true' || includeSubordinates === '1' || (includeSubordinates === undefined && processedOwnerId === undefined);
    
    // 如果 ownerId 未指定，且不是线索池（ownerId !== null），则使用当前用户过滤
    const currentMemberIdForFilter = processedOwnerId === undefined ? memberId : undefined;
    
    const data = await this.leadsService.findAll(
      tenantId,
      Number(page),
      Number(limit),
      processedSearch,
      processedStatus,
      processedRating,
      processedSource,
      processedOwnerId,
      currentMemberIdForFilter,
      processedIncludeSubordinates,
    );
    console.log('[LeadsController] 查询结果:', { total: data.total, count: data.leads.length });
    return { code: 200, message: '获取线索列表成功', data };
  }

  @Get('sources')
  async getSources() {
    return { code: 200, message: 'OK', data: SOURCE_OPTIONS };
  }

  @Post(':id/convert')
  async convert(
    @Param('id') id: string,
    @Body() body: {
      convertToCustomer?: boolean;
      convertToOpportunity?: boolean;
      opportunityName?: string;
      amount?: number;
      stage?: string;
      status?: string;
      probability?: number;
      expectedCloseDate?: string;
      assignToMemberId?: string;
      planNextActivity?: boolean;
      activityTitle?: string;
      activityType?: string;
      activityStartTime?: string;
      activityEndTime?: string;
      activityDescription?: string;
      activityLocation?: string;
      planNextVisit?: boolean;
      visitDescription?: string;
      visitType?: string;
      visitStartTime?: string;
      visitEndTime?: string;
      visitPurpose?: string;
      visitRegion?: string[];
      visitAddress?: string;
    },
    @Request() req: any,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const departmentId = req.user.currentDepartmentId 
      ? (typeof req.user.currentDepartmentId === 'string' ? parseInt(req.user.currentDepartmentId, 10) : req.user.currentDepartmentId)
      : undefined;
    const data = await this.leadsService.convert(parseInt(id, 10), tenantId, memberId, {
      convertToCustomer: body.convertToCustomer !== undefined ? body.convertToCustomer : true,
      convertToOpportunity: body.convertToOpportunity || false,
      opportunityName: body.opportunityName,
      amount: body.amount,
      stage: body.stage,
      status: body.status,
      probability: body.probability,
      expectedCloseDate: body.expectedCloseDate,
      assignToMemberId: body.assignToMemberId ? parseInt(body.assignToMemberId, 10) : undefined,
      departmentId,
      planNextActivity: body.planNextActivity || false,
      activityTitle: body.activityTitle,
      activityType: body.activityType,
      activityStartTime: body.activityStartTime,
      activityEndTime: body.activityEndTime,
      activityDescription: body.activityDescription,
      activityLocation: body.activityLocation,
      planNextVisit: body.planNextVisit || false,
      visitDescription: body.visitDescription,
      visitType: body.visitType,
      visitStartTime: body.visitStartTime,
      visitEndTime: body.visitEndTime,
      visitPurpose: body.visitPurpose,
      visitRegion: body.visitRegion,
      visitAddress: body.visitAddress,
    });
    return { code: 200, message: '线索转化成功', data };
  }

  @Get('statistics')
  async getStatistics(@Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const data = await this.leadsService.getStatistics(tenantId);
    return { code: 200, message: '获取统计数据成功', data };
  }

  @Post('move-to-pool')
  @HttpCode(HttpStatus.OK)
  async moveToPool(@Body() body: { leadIds: number[] | string[] }, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const leadIds = body.leadIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const data = await this.leadsService.moveToPool(leadIds, tenantId, memberId);
    return { code: 200, message: '放入线索池成功', data };
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claim(@Body() body: { leadIds: number[] | string[] }, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const leadIds = body.leadIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const data = await this.leadsService.claim(leadIds, tenantId, memberId);
    return { code: 200, message: '领取线索成功', data };
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  async transfer(
    @Body() body: { leadIds: string[] | number[]; newOwnerId: string | number },
    @Request() req: any,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const leadIds = body.leadIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const newOwnerId = typeof body.newOwnerId === 'string' ? parseInt(body.newOwnerId, 10) : body.newOwnerId;
    const data = await this.leadsService.transfer(leadIds, newOwnerId, tenantId, memberId);
    return { code: 200, message: '转移线索成功', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOne(@Param('id') id: string, @Request() req: any) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const data = await this.leadsService.delete([parseInt(id, 10)], tenantId, memberId);
    return { code: 200, message: '删除线索成功', data };
  }

  @Delete('batch')
  @HttpCode(HttpStatus.OK)
  async deleteBatch(
    @Body() body: { leadIds: string[] | number[] },
    @Request() req: any,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const leadIds = body.leadIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
    const data = await this.leadsService.delete(leadIds, tenantId, memberId);
    return { code: 200, message: '批量删除线索成功', data };
  }
}


