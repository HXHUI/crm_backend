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
import { DepartmentService, CreateDepartmentDto, UpdateDepartmentDto } from './department.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('departments')
@UseGuards(AuthGuard('jwt'))
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  // GET /departments - 获取部门树形结构
  @Get('tree')
  async getDepartmentTree(@CurrentUser() user: any) {
    const result = await this.departmentService.getDepartmentTree(user.tenantId);
    return {
      code: 200,
      message: '获取部门树成功',
      data: result
    };
  }

  // GET /departments - 获取部门列表
  @Get()
  async getDepartments(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const result = await this.departmentService.getDepartments(user.tenantId, page, limit, search);
    return {
      code: 200,
      message: '获取部门列表成功',
      data: result
    };
  }

  // GET /departments/:id - 获取特定部门详情
  @Get(':id')
  async getDepartment(@Param('id') id: string, @CurrentUser() user: any) {
    const result = await this.departmentService.getDepartmentById(parseInt(id, 10), user.tenantId);
    return {
      code: 200,
      message: '获取部门详情成功',
      data: result
    };
  }

  // POST /departments - 创建新部门
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDepartment(
    @Body() createDepartmentDto: CreateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    const tenantId = typeof user.tenantId === 'string' ? parseInt(user.tenantId, 10) : user.tenantId;
    const memberId = typeof user.memberId === 'string' ? parseInt(user.memberId, 10) : user.memberId;
    const result = await this.departmentService.createDepartment(createDepartmentDto, tenantId, memberId);
    return {
      code: 201,
      message: '创建部门成功',
      data: result
    };
  }

  // PUT /departments/:id - 更新部门信息
  @Put(':id')
  async updateDepartment(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.departmentService.updateDepartment(parseInt(id, 10), updateDepartmentDto, user.tenantId);
    return {
      code: 200,
      message: '更新部门成功',
      data: result
    };
  }

  // DELETE /departments/:id - 删除部门
  @Delete(':id')
  async deleteDepartment(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.departmentService.deleteDepartment(parseInt(id, 10), user.tenantId);
    return {
      code: 200,
      message: '删除部门成功'
    };
  }

  // GET /departments/:id/members - 获取部门成员列表
  @Get(':id/members')
  async getDepartmentMembers(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const departmentId = id === 'root' ? 'root' : parseInt(id, 10);
    const result = await this.departmentService.getDepartmentMembers(departmentId, user.tenantId, page, limit, search);
    return {
      code: 200,
      message: '获取部门成员成功',
      data: result
    };
  }

  // POST /departments/:id/members/batch - 批量添加部门成员（必须在 :id/members 之前）
  @Post(':id/members/batch')
  @HttpCode(HttpStatus.CREATED)
  async batchAddDepartmentMembers(
    @Param('id') id: string,
    @Body() body: { memberIds: (string | number)[]; position?: string; isManager?: boolean },
    @CurrentUser() user: any,
  ) {
    const result = await this.departmentService.batchAddDepartmentMembers(
      parseInt(id, 10),
      body.memberIds.map(mid => typeof mid === 'string' ? parseInt(mid, 10) : mid),
      body.position || '',
      body.isManager || false,
      user.tenantId
    );
    return {
      code: 201,
      message: '批量添加部门成员成功',
      data: result
    };
  }

  // POST /departments/:id/members - 添加部门成员
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addDepartmentMember(
    @Param('id') id: string,
    @Body() body: { memberId: string; position?: string; isManager?: boolean },
    @CurrentUser() user: any,
  ) {
    const result = await this.departmentService.addDepartmentMember(parseInt(id, 10), parseInt(body.memberId, 10), body.position, body.isManager, user.tenantId);
    return {
      code: 201,
      message: '添加部门成员成功',
      data: result
    };
  }

  // DELETE /departments/:id/members/:memberId - 移除部门成员
  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDepartmentMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    await this.departmentService.removeDepartmentMember(parseInt(id, 10), parseInt(memberId, 10), user.tenantId);
    return {
      code: 204,
      message: '移除部门成员成功'
    };
  }

  // GET /departments/member/:memberId - 获取指定成员的部门列表
  @Get('member/:memberId')
  async getMemberDepartments(
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.departmentService.getMemberDepartments(parseInt(memberId, 10), user.tenantId);
    return {
      code: 200,
      message: '获取成员部门列表成功',
      data: result
    };
  }
}
