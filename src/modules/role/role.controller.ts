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
    const role = await this.roleService.create(createRoleDto, user.tenantId);
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
    const result = await this.roleService.findAll(queryDto, user.tenantId);
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
    const options = await this.roleService.getRoleOptions(user.tenantId);
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
    const role = await this.roleService.findOne(id, user.tenantId);
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
    const role = await this.roleService.update(id, updateRoleDto, user.tenantId);
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
    const role = await this.roleService.updateStatus(id, body.isActive, user.tenantId);
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
    await this.roleService.remove(id, user.tenantId);
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
    await this.roleService.removeBatch(body.ids, user.tenantId);
    return {
      code: 200,
      message: '批量删除角色成功',
    };
  }
}
