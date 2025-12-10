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
  HttpException,
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
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const departmentId = user.currentDepartmentId 
      ? (typeof user.currentDepartmentId === 'string' ? parseInt(user.currentDepartmentId, 10) : user.currentDepartmentId)
      : undefined;
    const opportunity = await this.opportunitiesService.createOpportunity(createOpportunityDto, memberId, tenantId, departmentId);
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
    @Query('search') search?: string,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.opportunitiesService.findAllOpportunities(
      memberId,
      tenantId,
      page,
      limit,
      {
        customerId: customerId ? parseInt(customerId, 10) : undefined,
        search,
        stage,
        status,
      }
    );
    return {
      code: 200,
      message: '获取商机列表成功',
      data: result
    };
  }

  @Get('stats')
  async getOpportunityStats(@CurrentUser() user: any) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const stats = await this.opportunitiesService.getOpportunityStats(memberId);
    return {
      code: 200,
      message: '获取商机统计成功',
      data: stats
    };
  }

  @Get('upcoming-close')
  async getUpcomingCloseOpportunities(
    @Query('days') days?: string,
    @CurrentUser() user?: any,
  ) {
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: []
      };
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: []
      };
    }
    const reminderDays = days ? parseInt(days, 10) : undefined;
    const opportunities = await this.opportunitiesService.getUpcomingCloseOpportunities(tenantId, reminderDays);
    return {
      code: 200,
      message: '获取即将成交商机成功',
      data: opportunities
    };
  }

  @Get(':id')
  async findOpportunityById(@Param('id') id: string, @CurrentUser() user: any) {
    if (!id || isNaN(parseInt(id, 10))) {
      return {
        code: 400,
        message: '商机ID无效',
        data: null
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: null
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: null
      };
    }
    const opportunity = await this.opportunitiesService.findOpportunityById(parseInt(id, 10), memberId, tenantId);
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
    if (!id || isNaN(parseInt(id, 10))) {
      return {
        code: 400,
        message: '商机ID无效',
        data: null
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在',
        data: null
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效',
        data: null
      };
    }
    const opportunity = await this.opportunitiesService.updateOpportunity(parseInt(id, 10), updateOpportunityDto, memberId, tenantId);
    return {
      code: 200,
      message: '更新商机成功',
      data: opportunity
    };
  }

  @Patch(':id/stage')
  async updateOpportunityStage(
    @Param('id') id: string,
    @Body() body: { stage: string | OpportunityStage },
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    
    // 验证阶段值是否有效
    const validStages = Object.values(OpportunityStage);
    const stage = typeof body.stage === 'string' ? (body.stage as OpportunityStage) : body.stage;
    
    if (!validStages.includes(stage)) {
      throw new HttpException(
        {
          code: 400,
          message: '无效的商机阶段',
          data: null
        },
        HttpStatus.BAD_REQUEST
      );
    }
    
    const opportunity = await this.opportunitiesService.updateOpportunityStage(
      parseInt(id, 10), 
      stage, 
      memberId,
      tenantId
    );
    
    // 格式化返回数据以匹配前端期望
    const formattedOpportunity = {
      id: opportunity.id,
      title: opportunity.name,
      description: opportunity.description,
      value: opportunity.amount,
      currency: 'CNY',
      stage: this.opportunitiesService.mapEntityStageToFrontend(opportunity.stage),
      status: this.opportunitiesService.mapEntityStatusToFrontend(opportunity.status),
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate?.toISOString() || '',
      customerId: opportunity.customerId,
      ownerId: opportunity.ownerId,
      customer: opportunity.customer ? { id: opportunity.customer.id, name: opportunity.customer.name } : null,
      owner: opportunity.owner ? { id: opportunity.owner.id, username: opportunity.owner.nickname || opportunity.owner.user?.username || 'Unknown' } : null,
      createdAt: opportunity.createdAt.toISOString(),
      updatedAt: opportunity.updatedAt.toISOString(),
    };
    
    return {
      code: 200,
      message: '更新商机阶段成功',
      data: formattedOpportunity
    };
  }

  @Patch(':id/status')
  async updateOpportunityStatus(
    @Param('id') id: string,
    @Body() body: { status: OpportunityStatus },
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const opportunity = await this.opportunitiesService.updateOpportunityStatus(parseInt(id, 10), body.status, memberId);
    return {
      code: 200,
      message: '更新商机状态成功',
      data: opportunity
    };
  }

  @Patch(':id/close')
  async closeOpportunity(
    @Param('id') id: string,
    @Body() body: { status: 'closed_won' | 'closed_lost' },
    @CurrentUser() user: any,
  ) {
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const opportunity = await this.opportunitiesService.closeOpportunity(parseInt(id, 10), body.status, memberId);
    return {
      code: 200,
      message: '关闭商机成功',
      data: opportunity
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteOpportunity(@Param('id') id: string, @CurrentUser() user: any) {
    if (!id || isNaN(parseInt(id, 10))) {
      return {
        code: 400,
        message: '商机ID无效'
      };
    }
    if (!user || !user.tenantId) {
      return {
        code: 400,
        message: '用户信息不存在'
      };
    }
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      return {
        code: 400,
        message: '租户ID无效'
      };
    }
    await this.opportunitiesService.deleteOpportunity(parseInt(id, 10), memberId, tenantId);
    return {
      code: 200,
      message: '删除商机成功'
    };
  }
}
