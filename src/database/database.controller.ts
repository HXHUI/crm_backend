import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DatabaseService } from './database.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Public()
  @Post('init')
  async initializeDatabase() {
    await this.databaseService.initializeDatabase();
    return {
      success: true,
      message: '数据库初始化完成',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('status')
  async getDatabaseStatus() {
    return await this.databaseService.getDatabaseStatus();
  }

  @Public()
  @Delete('reset')
  async resetDatabase() {
    await this.databaseService.resetDatabase();
    return {
      success: true,
      message: '数据库重置完成',
      timestamp: new Date().toISOString(),
    };
  }
}
