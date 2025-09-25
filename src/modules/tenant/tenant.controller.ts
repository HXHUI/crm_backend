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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantService, CreateTenantDto, UpdateTenantDto } from './tenant.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
@UseGuards(AuthGuard('jwt'))
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // GET /tenants - 获取租户列表
  @Get()
  async getTenants(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    const result = await this.tenantService.getTenants(page, limit, search);
    return {
      code: 200,
      message: '获取租户列表成功',
      data: result
    };
  }

  // GET /tenants/:id - 获取特定租户详情
  @Get(':id')
  async getTenant(@Param('id') id: string) {
    const result = await this.tenantService.getTenantById(id);
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
    const result = await this.tenantService.createTenant(createTenantDto, user.userId);
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
    const result = await this.tenantService.updateTenant(id, updateTenantDto, user.userId);
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
    await this.tenantService.deleteTenant(id, user.userId);
    return {
      code: 204,
      message: '删除租户成功'
    };
  }

  // GET /tenants/:id/members - 获取租户成员列表
  @Get(':id/members')
  async getTenantMembers(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    const result = await this.tenantService.getTenantMembers(id, page, limit, search);
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
    const result = await this.tenantService.addTenantMember(id, body.userId, body.role, user.userId);
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
    await this.tenantService.removeTenantMember(id, memberId, user.userId);
    return {
      code: 204,
      message: '移除租户成员成功'
    };
  }
}
