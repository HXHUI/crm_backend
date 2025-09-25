import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, LoginDto, RegisterDto } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login - 用户登录
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      code: 200,
      message: '登录成功',
      data: result
    };
  }

  // POST /auth/register - 用户注册
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      code: 201,
      message: '注册成功',
      data: result
    };
  }

  // POST /auth/logout - 用户登出
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any) {
    const result = await this.authService.logout(user.userId);
    return {
      code: 200,
      message: '登出成功',
      data: result
    };
  }

  // POST /auth/refresh - 刷新token
  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser() user: any) {
    const result = await this.authService.refreshToken(user.userId);
    return {
      code: 200,
      message: 'Token刷新成功',
      data: result
    };
  }

  // GET /auth/me - 获取当前用户信息
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@CurrentUser() user: any) {
    const result = await this.authService.getCurrentUser(user.userId);
    return {
      code: 200,
      message: '获取用户信息成功',
      data: result
    };
  }

  // PATCH /auth/password - 修改密码
  @Patch('password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: { oldPassword: string; newPassword: string },
    @CurrentUser() user: any,
  ) {
    const result = await this.authService.changePassword(user.userId, body.oldPassword, body.newPassword);
    return {
      code: 200,
      message: '密码修改成功',
      data: result
    };
  }

  // GET /auth/check-phone - 检查手机号码是否存在
  @Public()
  @Get('check-phone')
  async checkPhoneExists(@Query('phone') phone: string) {
    const result = await this.authService.checkPhoneExists(phone);
    return {
      code: 200,
      message: '检查完成',
      data: result
    };
  }
}
