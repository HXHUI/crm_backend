import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MigrationService } from '../database/migrations/migration.service';

@Injectable()
export class CliService {
  private readonly logger = new Logger(CliService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly migrationService: MigrationService,
  ) {}

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    this.logger.log('🚀 开始初始化CRM数据库...');
    
    try {
      // 1. 初始化数据库和表结构
      await this.databaseService.initializeDatabase();
      
      // 2. 运行迁移
      await this.migrationService.runMigrations();
      
      this.logger.log('✅ 数据库初始化完成！');
      this.logger.log('📊 可以访问 http://localhost:3000/api/v1/database/status 查看数据库状态');
    } catch (error) {
      this.logger.error('❌ 数据库初始化失败:', error);
      process.exit(1);
    }
  }

  /**
   * 运行迁移
   */
  async migrate(): Promise<void> {
    this.logger.log('🔄 开始运行数据库迁移...');
    
    try {
      await this.migrationService.runMigrations();
      this.logger.log('✅ 数据库迁移完成！');
    } catch (error) {
      this.logger.error('❌ 数据库迁移失败:', error);
      process.exit(1);
    }
  }

  /**
   * 创建迁移文件
   */
  async createMigration(name: string): Promise<void> {
    this.logger.log(`📝 创建迁移文件: ${name}`);
    
    try {
      const fileName = await this.migrationService.createMigration(name);
      this.logger.log(`✅ 迁移文件创建成功: ${fileName}`);
      this.logger.log(`📁 文件位置: src/database/migrations/versions/${fileName}`);
    } catch (error) {
      this.logger.error('❌ 创建迁移文件失败:', error);
      process.exit(1);
    }
  }

  /**
   * 查看迁移状态
   */
  async migrationStatus(): Promise<void> {
    this.logger.log('📊 查看迁移状态...');
    
    try {
      const status = await this.migrationService.getMigrationStatus();
      
      console.log('\n📋 迁移状态报告:');
      console.log(`   总迁移数: ${status.total}`);
      console.log(`   已执行: ${status.executed}`);
      console.log(`   待执行: ${status.pending}`);
      
      if (status.lastExecuted) {
        console.log(`   最后执行: ${status.lastExecuted.version} - ${status.lastExecuted.name}`);
      }
      
      if (status.nextPending) {
        console.log(`   下一个待执行: ${status.nextPending.version} - ${status.nextPending.name}`);
      }
      
      console.log('\n📝 迁移详情:');
      status.migrations.forEach(migration => {
        const status = migration.executed ? '✅' : '⏳';
        console.log(`   ${status} ${migration.version} - ${migration.name}`);
      });
      
    } catch (error) {
      this.logger.error('❌ 获取迁移状态失败:', error);
      process.exit(1);
    }
  }

  /**
   * 查看数据库状态
   */
  async databaseStatus(): Promise<void> {
    this.logger.log('📊 查看数据库状态...');
    
    try {
      const status = await this.databaseService.getDatabaseStatus();
      
      console.log('\n🗄️  数据库状态报告:');
      console.log(`   状态: ${status.status}`);
      console.log(`   数据库: ${status.database}`);
      console.log(`   表数量: ${status.tables?.length || 0}`);
      console.log(`   检查时间: ${status.timestamp}`);
      
      if (status.tables && status.tables.length > 0) {
        console.log('\n📋 数据表列表:');
        status.tables.forEach(table => {
          console.log(`   📄 ${table.TABLE_NAME} (${table.TABLE_ROWS} 行)`);
        });
      }
      
    } catch (error) {
      this.logger.error('❌ 获取数据库状态失败:', error);
      process.exit(1);
    }
  }

  /**
   * 重置数据库（谨慎使用）
   */
  async reset(): Promise<void> {
    this.logger.warn('⚠️  警告：此操作将删除所有数据！');
    this.logger.warn('🔄 开始重置数据库...');
    
    try {
      await this.databaseService.resetDatabase();
      this.logger.log('✅ 数据库重置完成！');
    } catch (error) {
      this.logger.error('❌ 数据库重置失败:', error);
      process.exit(1);
    }
  }
}
