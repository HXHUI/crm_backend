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
import { OpportunitiesService, CreateOpportunityDto, UpdateOpportunityDto } from './opportunities.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OpportunityStage, OpportunityStatus } from '../../entities/opportunity.entity';

@Controller('opportunities')
@UseGuards(AuthGuard('jwt'))
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOpportunity(@Body() createOpportunityDto: CreateOpportunityDto, @CurrentUser() user: any) {
    const opportunity = await this.opportunitiesService.createOpportunity(createOpportunityDto, user.memberId, user.tenantId);
    return {
      code: 201,
      message: '创建商机成功',
      data: opportunity
    };
  }

  @Get()
  async findAllOpportunities(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('customerId') customerId?: string,
    @CurrentUser() user?: any,
  ) {
    const result = await this.opportunitiesService.findAllOpportunities(user.memberId, user.tenantId, page, limit, customerId);
    return {
      code: 200,
      message: '获取商机列表成功',
      data: result
    };
  }

  @Get('stats')
  async getOpportunityStats(@CurrentUser() user: any) {
    const stats = await this.opportunitiesService.getOpportunityStats(user.memberId);
    return {
      code: 200,
      message: '获取商机统计成功',
      data: stats
    };
  }

  @Get(':id')
  async findOpportunityById(@Param('id') id: string, @CurrentUser() user: any) {
    const opportunity = await this.opportunitiesService.findOpportunityById(id, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '获取商机详情成功',
      data: opportunity
    };
  }

  @Patch(':id')
  async updateOpportunity(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
    @CurrentUser() user: any,
  ) {
    const opportunity = await this.opportunitiesService.updateOpportunity(id, updateOpportunityDto, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '更新商机成功',
      data: opportunity
    };
  }

  @Patch(':id/stage')
  async updateOpportunityStage(
    @Param('id') id: string,
    @Body() body: { stage: OpportunityStage },
    @CurrentUser() user: any,
  ) {
    const opportunity = await this.opportunitiesService.updateOpportunityStage(id, body.stage, user.memberId);
    return {
      code: 200,
      message: '更新商机阶段成功',
      data: opportunity
    };
  }

  @Patch(':id/close')
  async closeOpportunity(
    @Param('id') id: string,
    @Body() body: { status: OpportunityStatus.CLOSED_WON | OpportunityStatus.CLOSED_LOST },
    @CurrentUser() user: any,
  ) {
    const opportunity = await this.opportunitiesService.closeOpportunity(id, body.status, user.memberId);
    return {
      code: 200,
      message: '关闭商机成功',
      data: opportunity
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOpportunity(@Param('id') id: string, @CurrentUser() user: any) {
    await this.opportunitiesService.deleteOpportunity(id, user.memberId, user.tenantId);
    return {
      code: 200,
      message: '删除商机成功'
    };
  }
}
