import { Controller, Get, Query, UseGuards, Request, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';
import { TenantService } from '../tenant/tenant.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * 根据视图类型和权限获取可查询的租户ID列表
   */
  private async getTenantIdsForQuery(
    tenantId: number,
    memberId: number,
    viewType: 'tenant' | 'group' = 'tenant',
  ): Promise<number[]> {
    // 如果是租户视图，只返回当前租户
    if (viewType === 'tenant') {
      return [tenantId];
    }

    // 如果是集团视图，检查权限
    const isGroupAdmin = await this.tenantService.isGroupAdmin(tenantId, memberId);
    if (!isGroupAdmin) {
      throw new ForbiddenException('只有集团管理员才能查看集团视图');
    }

    // 获取所有可访问的租户ID（包括自己和所有子租户）
    return await this.tenantService.getAccessibleTenantIds(tenantId, memberId);
  }

  @Get('sales-briefs')
  @HttpCode(HttpStatus.OK)
  async getSalesBriefs(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getSalesBriefForTenants(
      tenantIds, 
      period, 
      startDate, 
      endDate,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取销售简报成功', data };
  }

  @Get('sales-briefs/trend')
  @HttpCode(HttpStatus.OK)
  async getSalesBriefsTrend(
    @Request() req: any,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, memberId, viewType);
    const data = await this.statisticsService.getSalesBriefTrendForTenants(tenantIds);
    return { code: 200, message: '获取销售简报趋势数据成功', data };
  }

  @Get('data-summary')
  @HttpCode(HttpStatus.OK)
  async getDataSummary(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getDataSummaryForTenants(
      tenantIds, 
      period, 
      startDate, 
      endDate,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取数据汇总成功', data };
  }

  @Get('customer-reminders')
  @HttpCode(HttpStatus.OK)
  async getCustomerReminders(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getCustomerRemindersForTenants(
      tenantIds,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取客户遗忘提醒成功', data };
  }

  @Get('sales-funnel')
  @HttpCode(HttpStatus.OK)
  async getSalesFunnel(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getSalesFunnelForTenants(
      tenantIds,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取销售漏斗成功', data };
  }

  @Get('opportunity-stage-distribution')
  @HttpCode(HttpStatus.OK)
  async getOpportunityStageDistribution(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getOpportunityStageDistributionForTenants(
      tenantIds,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取商机阶段分布成功', data };
  }

  @Get('customer-conversion-funnel')
  @HttpCode(HttpStatus.OK)
  async getCustomerConversionFunnel(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getCustomerConversionFunnelForTenants(
      tenantIds,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取客户转化漏斗成功', data };
  }

  @Get('customer-source-distribution')
  @HttpCode(HttpStatus.OK)
  async getCustomerSourceDistribution(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getCustomerSourceDistributionForTenants(
      tenantIds,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取客户来源分布成功', data };
  }

  @Get('customer-map')
  @HttpCode(HttpStatus.OK)
  async getCustomerMapData(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('onlyConverted') onlyConverted: string = 'false',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const isOnlyConverted = onlyConverted === 'true' || onlyConverted === '1';
    
    const data = await this.statisticsService.getCustomerMapDataForTenants(
      tenantIds,
      isOnlyConverted,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取客户地图数据成功', data };
  }

  @Get('customer-city-map')
  @HttpCode(HttpStatus.OK)
  async getCustomerCityMapData(
    @Request() req: any,
    @Query('onlyConverted') onlyConverted: string = 'false',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    const parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || 'me_and_subordinates';
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const isOnlyConverted = onlyConverted === 'true' || onlyConverted === '1';
    
    const data = await this.statisticsService.getCustomerCityMapDataForTenants(
      tenantIds,
      isOnlyConverted,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取客户城市地图数据成功', data };
  }

  @Get('ranking-list')
  @HttpCode(HttpStatus.OK)
  async getRankingList(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' | 'last_week' | 'last_month' | 'last_quarter' | 'last_year' | 'custom' = 'month',
    @Query('metric') metric: 'newCustomers' | 'newContacts' | 'newActivities' | 'paymentAmount' | 'contractAmount' | 'contractCount' = 'newCustomers',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    
    // 兼容旧的 scope 参数
    let parsedScopeType: 'me_and_subordinates' | 'all' | 'department' | 'member' = scopeType || (scope === 'all' ? 'all' : 'me_and_subordinates');
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    
    const data = await this.statisticsService.getRankingListForTenants(
      tenantIds,
      parsedScopeType,
      period,
      metric,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
      startDate,
      endDate,
    );
    return { code: 200, message: '获取排行榜数据成功', data };
  }

  @Get('daily-sales')
  @HttpCode(HttpStatus.OK)
  async getDailySales(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const memberId = scope === 'me' 
      ? (typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId)
      : undefined;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, memberId || 0, viewType);
    const data = await this.statisticsService.getDailySalesStatsForTenants(tenantIds, memberId);
    return { code: 200, message: '获取今日销售额统计成功', data };
  }

  @Get('monthly-contract-amount')
  @HttpCode(HttpStatus.OK)
  async getMonthlyContractAmount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyContractAmountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度合同金额成功', data };
  }

  @Get('monthly-order-amount')
  @HttpCode(HttpStatus.OK)
  async getMonthlyOrderAmount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyOrderAmountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度订单金额成功', data };
  }

  @Get('contract-amount-ranking')
  @HttpCode(HttpStatus.OK)
  async getContractAmountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getContractAmountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取合同金额排行榜成功', data };
  }

  @Get('order-amount-ranking')
  @HttpCode(HttpStatus.OK)
  async getOrderAmountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getOrderAmountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取订单金额排行榜成功', data };
  }

  @Get('monthly-lead-count')
  @HttpCode(HttpStatus.OK)
  async getMonthlyLeadCount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyLeadCountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增线索数成功', data };
  }

  @Get('monthly-customer-count')
  @HttpCode(HttpStatus.OK)
  async getMonthlyCustomerCount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyCustomerCountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增客户数成功', data };
  }

  @Get('monthly-opportunity-count')
  @HttpCode(HttpStatus.OK)
  async getMonthlyOpportunityCount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyOpportunityCountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增商机数成功', data };
  }

  @Get('monthly-won-opportunity-count')
  @HttpCode(HttpStatus.OK)
  async getMonthlyWonOpportunityCount(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyWonOpportunityCountForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度赢单商机数成功', data };
  }

  @Get('lead-count-ranking')
  @HttpCode(HttpStatus.OK)
  async getLeadCountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getLeadCountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取新增线索数排行榜成功', data };
  }

  @Get('customer-count-ranking')
  @HttpCode(HttpStatus.OK)
  async getCustomerCountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getCustomerCountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取新增客户数排行榜成功', data };
  }

  @Get('opportunity-count-ranking')
  @HttpCode(HttpStatus.OK)
  async getOpportunityCountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getOpportunityCountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取新增商机数排行榜成功', data };
  }

  @Get('won-opportunity-count-ranking')
  @HttpCode(HttpStatus.OK)
  async getWonOpportunityCountRanking(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getWonOpportunityCountRankingForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取赢单商机数排行榜成功', data };
  }

  @Get('monthly-contract-amount-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyContractAmountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyContractAmountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度合同金额（含同比）成功', data };
  }

  @Get('monthly-order-amount-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyOrderAmountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyOrderAmountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度订单金额（含同比）成功', data };
  }

  @Get('monthly-lead-count-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyLeadCountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyLeadCountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增线索数（含同比）成功', data };
  }

  @Get('monthly-customer-count-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyCustomerCountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyCustomerCountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增客户数（含同比）成功', data };
  }

  @Get('monthly-opportunity-count-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyOpportunityCountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyOpportunityCountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度新增商机数（含同比）成功', data };
  }

  @Get('monthly-won-opportunity-count-with-yoy')
  @HttpCode(HttpStatus.OK)
  async getMonthlyWonOpportunityCountWithYOY(
    @Request() req: any,
    @Query('year') year: string,
    @Query('scopeType') scopeType?: 'me_and_subordinates' | 'all' | 'department' | 'member',
    @Query('departmentId') departmentId?: string,
    @Query('memberId') memberId?: string,
    @Query('viewType') viewType: 'tenant' | 'group' = 'tenant',
  ) {
    const tenantId = typeof req.user.tenantId === 'string' ? parseInt(req.user.tenantId, 10) : req.user.tenantId;
    const currentMemberId = typeof req.user.memberId === 'string' ? parseInt(req.user.memberId, 10) : req.user.memberId;
    const tenantIds = await this.getTenantIdsForQuery(tenantId, currentMemberId, viewType);
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    const parsedDepartmentId = departmentId ? parseInt(departmentId, 10) : undefined;
    const parsedMemberId = memberId ? parseInt(memberId, 10) : undefined;
    const parsedScopeType = scopeType || 'me_and_subordinates';
    
    const data = await this.statisticsService.getMonthlyWonOpportunityCountWithYearOverYearForTenants(
      tenantIds,
      yearNum,
      parsedScopeType,
      parsedDepartmentId,
      parsedMemberId,
      currentMemberId,
      tenantId,
    );
    return { code: 200, message: '获取月度赢单商机数（含同比）成功', data };
  }

}
