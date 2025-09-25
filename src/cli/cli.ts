import { NestFactory } from '@nestjs/core';
import { CliModule } from './cli.module';
import { CliService } from './cli.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CliModule);
  const cliService = app.get(CliService);

  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'init':
        await cliService.init();
        break;
      case 'migrate':
        await cliService.migrate();
        break;
      case 'create-migration':
        if (args.length === 0) {
          console.error('❌ 请提供迁移名称');
          process.exit(1);
        }
        await cliService.createMigration(args[0]);
        break;
      case 'migration-status':
        await cliService.migrationStatus();
        break;
      case 'db-status':
        await cliService.databaseStatus();
        break;
      case 'reset':
        await cliService.reset();
        break;
      default:
        console.log('🚀 CRM CLI 工具');
        console.log('');
        console.log('可用命令:');
        console.log('  init                初始化数据库');
        console.log('  migrate             运行数据库迁移');
        console.log('  create-migration    创建迁移文件');
        console.log('  migration-status    查看迁移状态');
        console.log('  db-status           查看数据库状态');
        console.log('  reset               重置数据库（谨慎使用）');
        console.log('');
        console.log('示例:');
        console.log('  npm run cli init');
        console.log('  npm run cli create-migration add-user-table');
        console.log('  npm run cli migration-status');
        break;
    }
  } catch (error) {
    console.error('❌ 命令执行失败:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
