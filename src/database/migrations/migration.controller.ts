import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MigrationService } from './migration.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('migrations')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Public()
  @Post('run')
  async runMigrations() {
    await this.migrationService.runMigrations();
    return {
      success: true,
      message: '迁移执行完成',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('status')
  async getMigrationStatus() {
    return await this.migrationService.getMigrationStatus();
  }

  @Public()
  @Post('create/:name')
  async createMigration(@Param('name') name: string) {
    const fileName = await this.migrationService.createMigration(name);
    return {
      success: true,
      message: '迁移文件创建成功',
      fileName,
      timestamp: new Date().toISOString(),
    };
  }
}
