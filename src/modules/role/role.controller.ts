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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * 创建角色
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const role = await this.roleService.create(createRoleDto, tenantId, memberId);
    return {
      code: 201,
      message: '创建角色成功',
      data: role,
    };
  }

  /**
   * 查询角色列表
   */
  @Get()
  async findAll(
    @Query() queryDto: QueryRoleDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const result = await this.roleService.findAll(queryDto, tenantId);
    return {
      code: 200,
      message: '查询成功',
      data: result,
    };
  }

  /**
   * 获取角色选项（用于下拉选择）
   */
  @Get('options')
  async getRoleOptions(@CurrentUser() user: any) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const options = await this.roleService.getRoleOptions(tenantId);
    return {
      code: 200,
      message: '查询成功',
      data: options,
    };
  }

  /**
   * 根据ID查询角色
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const role = await this.roleService.findOne(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '查询成功',
      data: role,
    };
  }

  /**
   * 更新角色
   */
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const role = await this.roleService.update(parseInt(id, 10), updateRoleDto, tenantId);
    return {
      code: 200,
      message: '更新角色成功',
      data: role,
    };
  }

  /**
   * 更新角色状态
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const role = await this.roleService.updateStatus(parseInt(id, 10), body.isActive, tenantId);
    return {
      code: 200,
      message: '更新角色状态成功',
      data: role,
    };
  }

  /**
   * 删除角色
   */
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.roleService.remove(parseInt(id, 10), tenantId);
    return {
      code: 200,
      message: '删除角色成功',
    };
  }

  /**
   * 批量删除角色
   */
  @Delete('batch')
  async removeBatch(
    @Body() body: { ids: string[] },
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    await this.roleService.removeBatch(body.ids.map(id => parseInt(id, 10)), tenantId);
    return {
      code: 200,
      message: '批量删除角色成功',
    };
  }
}
