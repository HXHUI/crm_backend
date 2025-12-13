import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService, UpdateUserDto, UpdateUserProfileDto, CreateUserDto } from './user.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private readonly userService: UserService) {}

  // POST /users - 创建用户
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    const createdByUserId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.userService.createUser(createUserDto, createdByUserId);
    return {
      code: 201,
      message: '创建用户成功',
      data: result
    };
  }

  // GET /users - 获取用户列表
  @Get()
  async getUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('search') search?: string,
  ) {
    const result = await this.userService.getUsers(page, limit, search);
    return {
      code: 200,
      message: '获取用户列表成功',
      data: result
    };
  }

  // GET /users/:id - 获取特定用户详情
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const result = await this.userService.getUserById(parseInt(id, 10));
    return {
      code: 200,
      message: '获取用户详情成功',
      data: result
    };
  }

  // PUT /users/:id - 更新用户信息
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.userService.updateUser(parseInt(id, 10), updateUserDto, userId);
    return {
      code: 200,
      message: '更新用户信息成功',
      data: result
    };
  }

  // PATCH /users/:id/profile - 更新用户个人资料
  @Patch(':id/profile')
  async updateUserProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.userService.updateUserProfile(parseInt(id, 10), updateProfileDto, userId);
    return {
      code: 200,
      message: '更新个人资料成功',
      data: result
    };
  }

  // PATCH /users/:id/status - 更新用户状态
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' | 'suspended' },
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    const result = await this.userService.updateUserStatus(parseInt(id, 10), body.status as any, userId);
    return {
      code: 200,
      message: '更新用户状态成功',
      data: result
    };
  }

  // GET /users/:id/members - 获取用户的租户成员记录
  @Get(':id/members')
  async getUserMembers(@Param('id') id: string) {
    const result = await this.userService.getUserMembers(parseInt(id, 10));
    return {
      code: 200,
      message: '获取用户成员记录成功',
      data: result
    };
  }

  // DELETE /users/:id - 删除用户
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const userId = typeof user.userId === 'string' ? parseInt(user.userId, 10) : user.userId;
    await this.userService.deleteUser(parseInt(id, 10), userId);
    return {
      code: 200,
      message: '删除用户成功'
    };
  }
}
