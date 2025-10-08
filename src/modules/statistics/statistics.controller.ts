import { Controller, Get, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('sales-briefs')
  @HttpCode(HttpStatus.OK)
  async getSalesBriefs(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    const tenantId = req.user.tenantId;
    const data = await this.statisticsService.getSalesBrief(tenantId, period);
    return { code: 200, message: '获取销售简报成功', data };
  }

  @Get('data-summary')
  @HttpCode(HttpStatus.OK)
  async getDataSummary(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    const tenantId = req.user.tenantId;
    const data = await this.statisticsService.getDataSummary(tenantId, period);
    return { code: 200, message: '获取数据汇总成功', data };
  }

  @Get('customer-reminders')
  @HttpCode(HttpStatus.OK)
  async getCustomerReminders(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
  ) {
    const tenantId = req.user.tenantId;
    const memberId = scope === 'me' ? req.user.memberId : undefined;
    const data = await this.statisticsService.getCustomerReminders(tenantId, memberId);
    return { code: 200, message: '获取客户遗忘提醒成功', data };
  }

  @Get('sales-funnel')
  @HttpCode(HttpStatus.OK)
  async getSalesFunnel(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
  ) {
    const tenantId = req.user.tenantId;
    const memberId = scope === 'me' ? req.user.memberId : undefined;
    const data = await this.statisticsService.getSalesFunnel(tenantId, memberId);
    return { code: 200, message: '获取销售漏斗成功', data };
  }

  @Get('customer-source-distribution')
  @HttpCode(HttpStatus.OK)
  async getCustomerSourceDistribution(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
  ) {
    const tenantId = req.user.tenantId;
    const memberId = scope === 'me' ? req.user.memberId : undefined;
    const data = await this.statisticsService.getCustomerSourceDistribution(tenantId, memberId);
    return { code: 200, message: '获取客户来源分布成功', data };
  }

  @Get('customer-map')
  @HttpCode(HttpStatus.OK)
  async getCustomerMapData(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
  ) {
    const tenantId = req.user.tenantId;
    const memberId = scope === 'me' ? req.user.memberId : undefined;
    const data = await this.statisticsService.getCustomerMapData(tenantId, memberId);
    return { code: 200, message: '获取客户地图数据成功', data };
  }

  @Get('ranking-list')
  @HttpCode(HttpStatus.OK)
  async getRankingList(
    @Request() req: any,
    @Query('scope') scope: 'me' | 'all' = 'me',
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
    @Query('metric') metric: 'newCustomers' | 'newContacts' | 'newActivities' | 'paymentAmount' | 'contractAmount' | 'contractCount' = 'newCustomers',
  ) {
    const tenantId = req.user.tenantId;
    const memberId = req.user.memberId;
    const data = await this.statisticsService.getRankingList(tenantId, memberId, scope, period, metric);
    return { code: 200, message: '获取排行榜数据成功', data };
  }
}
