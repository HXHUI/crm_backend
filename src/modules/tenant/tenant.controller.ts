import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  TenantService,
  CreateTenantDto,
  UpdateTenantDto,
  TenantPricingConfig,
  TenantProductConfig,
} from './tenant.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // GET /tenants - 获取租户列表
  @Get()
  async getTenants(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const result = await this.tenantService.getTenants(page, limit, search);
    return {
      code: 200,
      message: '获取租户列表成功',
      data: result
    };
  }

  // GET /tenants/members - 获取当前租户的成员列表（必须放在 :id 路由之前）
  @Get('members')
  async getCurrentTenantMembers(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    if (!user || !user.tenantId) {
      throw new ForbiddenException('未获取到租户信息，请重新登录');
    }
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    if (isNaN(tenantId)) {
      throw new BadRequestException('租户ID格式错误');
    }
    const result = await this.tenantService.getTenantMembers(tenantId, page, limit, search);
    return {
      code: 200,
      message: '获取成员列表成功',
      data: result
    };
  }

  // GET /tenants/:id - 获取特定租户详情
  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const result = await this.tenantService.getTenantById(parseInt(id, 10));
    return {
      code: 200,
      message: '获取租户详情成功',
      data: result
    };
  }

  // POST /tenants - 创建新租户
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.tenantService.createTenant(createTenantDto, userId);
    return {
      code: 201,
      message: '创建租户成功',
      data: result
    };
  }

  // PUT /tenants/:id - 更新租户信息
  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.tenantService.updateTenant(parseInt(id, 10), updateTenantDto, userId);
    return {
      code: 200,
      message: '更新租户成功',
      data: result
    };
  }

  // DELETE /tenants/:id - 删除租户
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTenant(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    await this.tenantService.deleteTenant(parseInt(id, 10), userId);
    return {
      code: 204,
      message: '删除租户成功'
    };
  }

  // GET /tenants/:id/members - 获取指定租户的成员列表
  @Get(':id/members')
  async getTenantMembers(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const result = await this.tenantService.getTenantMembers(parseInt(id, 10), page, limit, search);
    return {
      code: 200,
      message: '获取租户成员列表成功',
      data: result
    };
  }

  // POST /tenants/:id/members - 添加租户成员
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addTenantMember(
    @Param('id') id: string,
    @Body() body: { userId: string; role?: string },
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.tenantService.addTenantMember(parseInt(id, 10), parseInt(body.userId, 10), body.role, userId);
    return {
      code: 201,
      message: '添加租户成员成功',
      data: result
    };
  }

  // DELETE /tenants/:id/members/:memberId - 移除租户成员
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTenantMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    await this.tenantService.removeTenantMember(parseInt(id, 10), parseInt(memberId, 10), userId);
    return {
      code: 204,
      message: '移除租户成员成功'
    };
  }

  // GET /tenants/:id/children - 获取子租户列表
  @Get(':id/children')
  async getChildTenants(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const tenantId = parseInt(id, 10);
    
    // 验证用户是否有权限查看该租户的子租户
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('只有租户所有者才能查看子租户列表');
    }

    const result = await this.tenantService.getChildTenants(tenantId);
    return {
      code: 200,
      message: '获取子租户列表成功',
      data: result
    };
  }

  // GET /tenants/:id/pricing-config - 获取租户价格配置
  @Get(':id/pricing-config')
  async getPricingConfig(
    @Param('id') id: string,
  ) {
    const result = await this.tenantService.getPricingConfig(parseInt(id, 10));
    return {
      code: 200,
      message: '获取价格配置成功',
      data: result
    };
  }

  // PUT /tenants/:id/pricing-config - 更新租户价格配置
  @Put(':id/pricing-config')
  async updatePricingConfig(
    @Param('id') id: string,
    @Body() pricingConfig: TenantPricingConfig,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.tenantService.updatePricingConfig(parseInt(id, 10), pricingConfig, userId);
    return {
      code: 200,
      message: '更新价格配置成功',
      data: result
    };
  }

  // GET /tenants/:id/product-config - 获取租户产品配置（分类字段、分类选项、编码规则）
  @Get(':id/product-config')
  async getProductConfig(
    @Param('id') id: string,
  ) {
    const result = await this.tenantService.getProductConfig(parseInt(id, 10));
    return {
      code: 200,
      message: '获取产品配置成功',
      data: result,
    };
  }

  // PUT /tenants/:id/product-config - 更新租户产品配置
  @Put(':id/product-config')
  async updateProductConfig(
    @Param('id') id: string,
    @Body() productConfig: TenantProductConfig,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.tenantService.updateProductConfig(parseInt(id, 10), productConfig, userId);
    return {
      code: 200,
      message: '更新产品配置成功',
      data: result,
    };
  }

  // POST /tenants/:id/product-code/preview - 预览产品编码
  @Post(':id/product-code/preview')
  async previewProductCode(
    @Param('id') id: string,
    @Body()
    body: {
      fieldCodes?: Record<string, string>;
      date?: Date | string;
    },
  ) {
    const result = await this.tenantService.previewProductCode(parseInt(id, 10), body);
    return {
      code: 200,
      message: '预览产品编码成功',
      data: result,
    };
  }
}
